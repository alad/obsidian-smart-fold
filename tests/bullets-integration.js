(async () => {
  const previous = app.workspace.getMostRecentLeaf();
  const path = '__smart_fold_bullets_' + Date.now() + '.md';
  const content = '# Heading\n- Parent\n  - Child\n    - Grandchild\n  - Sibling\n- Other\n\nOutside\n\n1. Ordered\n   1. Nested\n\n- [ ] Task\n  - [ ] Subtask\n\n```md\n- Fake\n  - Fake child\n```\n';
  const file = await app.vault.create(path, content);
  const leaf = app.workspace.getLeaf('tab');
  const results = [];
  const check = (ok, label) => { if (!ok) throw Error(label); results.push(label); };
  try {
    await leaf.openFile(file);
    for (const source of [true, false]) {
      await leaf.setViewState({ type: 'markdown', state: { file: path, mode: 'source', source } });
      await new Promise(r => setTimeout(r, 150));
      const e = leaf.view.editor, p = app.plugins.plugins['obsidian-smart-fold'];
      const toggle = () => app.commands.commands['obsidian-smart-fold:smart-toggle-fold'].editorCallback(e, leaf.view);
      const mode = source ? 'source' : 'live preview';
      e.exec('unfoldAll');
      for (const [label, cursor, expected] of [
        ['grandchild targets child', 3, 2], ['foldable bullet targets itself', 2, 2],
        ['leaf sibling targets parent', 4, 1], ['top-level sibling falls back to heading', 5, 0],
        ['outside list falls back to heading', 7, 0], ['numbered child targets parent', 10, 9],
        ['task child targets parent', 13, 12], ['fake bullet in code falls back to heading', 17, 0]
      ]) {
        e.setCursor({line: cursor, ch: 0});
        check(p.findTarget(e)?.line.number - 1 === expected, mode + ': ' + label);
      }
      e.setCursor({line:3,ch:9}); toggle();
      check(e.getCursor().line === 2 && e.getFoldOffsets().size === 1, mode + ': child folds');
      e.setCursor({line:4,ch:5}); toggle();
      check(e.getCursor().line === 1 && e.getFoldOffsets().size === 2, mode + ': parent preserves child fold');
      toggle();
      check(e.getCursor().line === 4 && e.getCursor().ch === 5 && e.getFoldOffsets().size === 1, mode + ': parent restores its own cursor');
      e.setCursor({line:2,ch:0}); toggle();
      check(e.getCursor().line === 3 && e.getCursor().ch === 9 && e.getFoldOffsets().size === 0, mode + ': child restores exact cursor');
      e.setCursor({line:10,ch:6}); toggle(); toggle();
      check(e.getCursor().line === 10 && e.getCursor().ch === 6, mode + ': numbered list restores cursor');
      check(e.getValue() === content, mode + ': note unchanged');
    }
    // Lists work without any containing heading, including unsaved edits.
    const e = leaf.view.editor, p = app.plugins.plugins['obsidian-smart-fold'];
    e.setValue('- Parent\n  - Child\n- Sibling\n');
    e.setCursor({line:1,ch:5});
    check(p.findTarget(e)?.line.number === 1, 'list without heading works immediately');
    e.setCursor({line:2,ch:0});
    check(p.findTarget(e) === null, 'unfoldable sibling without heading does not target previous bullet');
    return JSON.stringify(results);
  } finally {
    leaf.detach();
    await app.vault.delete(file);
    app.workspace.setActiveLeaf(previous, {focus:true});
  }
})()
