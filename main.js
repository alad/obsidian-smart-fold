const { Plugin, Notice } = require('obsidian');
const { ensureSyntaxTree, foldedRanges, foldable, foldEffect, unfoldEffect } = require('@codemirror/language');
const { ChangeSet } = require('@codemirror/state');
const { EditorView } = require('@codemirror/view');

module.exports = class ObsidianSmartFold extends Plugin {
  onload() {
    // TFile identity survives renames; each file owns its heading bookmarks.
    this.memories = new Map();
    let cleanupTimer;
    const scheduleCleanup = () => {
      clearTimeout(cleanupTimer);
      cleanupTimer = setTimeout(() => this.pruneClosedFiles(), 0);
    };
    this.registerEvent(this.app.workspace.on('layout-change', scheduleCleanup));
    this.registerEvent(this.app.workspace.on('file-open', scheduleCleanup));
    this.register(() => { clearTimeout(cleanupTimer); this.memories.clear(); });
    this.registerEditorExtension(EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const file = this.fileForEditor(update.view);
      const memory = this.memories.get(file);
      if (!memory || memory.doc.eq(update.state.doc)) return;
      // Multiple panes can report the same edit. Map each file's bookmarks once.
      if (memory.doc.eq(update.startState.doc)) {
        this.mapMemory(memory, update.changes, update.state.doc);
      } else {
        this.syncMemory(memory, update.state.doc);
      }
    }));
    this.addCommand({
      id: 'smart-toggle-fold',
      name: 'Smart toggle fold',
      editorCallback: (editor, view) => this.toggleFold(editor, view)
    });
  }

  fileForEditor(cm) {
    let file = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view.editor?.cm === cm) file = leaf.view.file;
    });
    return file;
  }

  pruneClosedFiles() {
    const open = new Set();
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view.file) open.add(leaf.view.file);
    });
    for (const file of this.memories.keys()) {
      if (!open.has(file)) this.memories.delete(file);
    }
  }

  mapMemory(memory, changes, doc) {
    const mapped = new Map();
    for (const entry of memory.positions.values()) {
      let removed = false;
      changes.iterChanges((from, to) => {
        if (from <= entry.headingFrom && to >= entry.headingTo && to > from) removed = true;
      });
      if (removed) continue;
      const headingFrom = changes.mapPos(entry.headingFrom, 1);
      mapped.set(headingFrom, {
        headingFrom,
        headingTo: changes.mapPos(entry.headingTo, -1),
        cursor: changes.mapPos(entry.cursor, 1)
      });
    }
    memory.positions = mapped;
    memory.doc = doc;
  }

  syncMemory(memory, doc) {
    if (memory.doc.eq(doc)) return;
    // Reconcile edits made while an editor was detached or in reading mode.
    const before = memory.doc.toString(), after = doc.toString();
    let from = 0, oldEnd = before.length, newEnd = after.length;
    while (from < oldEnd && from < newEnd && before[from] === after[from]) from++;
    while (oldEnd > from && newEnd > from && before[oldEnd - 1] === after[newEnd - 1]) {
      oldEnd--; newEnd--;
    }
    this.mapMemory(memory, ChangeSet.of({ from, to: oldEnd, insert: after.slice(from, newEnd) }, before.length), doc);
  }

  findTarget(editor) {
    const state = editor.cm?.state;
    if (!state) return null;
    const cursorLine = state.doc.line(editor.getCursor('head').line + 1);
    // Parse the live buffer so newly typed lists and headings work immediately.
    const tree = ensureSyntaxTree(state, cursorLine.to, 100);
    if (!tree) return null;
    const candidates = new Set();
    tree.iterate({
      to: cursorLine.to,
      enter(node) {
        const heading = /^(ATXHeading[1-6]|SetextHeading[12])$/.test(node.name) ||
          /(?:^|_)HyperMD-header-[1-6](?:_|$)/.test(node.name);
        const list = node.name === 'ListItem' ||
          /(?:^|_)HyperMD-list-line(?:_|$)/.test(node.name);
        if (!heading && !list) return;
        if (heading && node.node.parent?.name !== 'Document') return false;
        const line = state.doc.lineAt(node.from);
        // Exclude quote prefixes and continuation lines without a list marker.
        if (list && !/^\s*(?:[-+*]|\d+[.)])(?:[ \t]+|$)/.test(line.text)) return;
        if (line.from <= cursorLine.from) candidates.add(line.number);
      }
    });
    // Use Obsidian's actual fold ranges, so siblings and text outside a list
    // cannot accidentally target a preceding list item.
    for (const number of [...candidates].sort((a, b) => b - a)) {
      const line = state.doc.line(number);
      let folded = null;
      foldedRanges(state).between(line.from, line.to, (from, to) => {
        if (from >= line.from && from <= line.to) folded = { from, to };
      });
      const range = folded || foldable(state, line.from, line.to);
      if (range && (number === cursorLine.number || cursorLine.to <= range.to)) {
        return { line, range, folded };
      }
    }
    return null;
  }

  toggleFold(editor, view) {
    const target = this.findTarget(editor);
    if (!target) {
      new Notice('No containing foldable heading or list item at the cursor.');
      return;
    }
    const cm = editor.cm;
    const file = view?.file || this.fileForEditor(cm);
    if (!file) return;
    let memory = this.memories.get(file);
    if (!memory) {
      memory = { positions: new Map(), doc: cm.state.doc };
      this.memories.set(file, memory);
    }
    this.syncMemory(memory, cm.state.doc);
    const positions = memory.positions;
    const { line: heading, range, folded } = target;
    if (folded) {
      const saved = positions.get(heading.from);
      // Discard stale destinations outside this heading's current section.
      const cursor = saved && saved.cursor >= heading.from && saved.cursor <= folded.to
        ? saved.cursor : cm.state.selection.main.head;
      cm.dispatch({
        effects: unfoldEffect.of(folded),
        selection: { anchor: cursor },
        scrollIntoView: true
      });
      positions.delete(heading.from);
      return;
    }
    positions.set(heading.from, {
      headingFrom: heading.from,
      headingTo: heading.to,
      cursor: cm.state.selection.main.head
    });
    cm.dispatch({
      effects: foldEffect.of(range),
      selection: { anchor: heading.from },
      scrollIntoView: true
    });
  }
};
