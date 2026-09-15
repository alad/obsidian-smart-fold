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
      editorCallback: (editor, view) => this.toggleHeading(editor, view)
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

  findHeading(editor) {
    const state = editor.cm?.state;
    if (!state) return null;
    const cursorLine = editor.getCursor('head').line;
    const position = state.doc.line(cursorLine + 1).to;
    // Parse the live buffer so newly typed headings work without waiting for cache updates.
    const tree = ensureSyntaxTree(state, position, 100);
    if (!tree) return null;
    let heading = null;
    tree.iterate({
      to: position,
      enter(node) {
        if (!/^(ATXHeading[1-6]|SetextHeading[12])$/.test(node.name) &&
            !/(?:^|_)HyperMD-header-[1-6](?:_|$)/.test(node.name)) return;
        // Only document headings; ignore heading-like content in quotes and code.
        if (node.node.parent?.name !== 'Document') return false;
        const line = state.doc.lineAt(node.from).number - 1;
        if (line <= cursorLine) heading = line;
        return false;
      }
    });
    return heading;
  }

  toggleHeading(editor, view) {
    const line = this.findHeading(editor);
    if (line === null) {
      new Notice('No containing heading at the cursor.');
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
    const heading = cm.state.doc.line(line + 1);
    let folded = null;
    foldedRanges(cm.state).between(heading.from, heading.to, (from, to) => {
      if (from >= heading.from && from <= heading.to) folded = { from, to };
    });
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
    const range = foldable(cm.state, heading.from, heading.to);
    if (!range) return;
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
