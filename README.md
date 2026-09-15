# Obsidian Smart Fold

**Fold from where you’re writing. Unfold to return there.**

Smart toggle fold collapses the nearest foldable list item or heading containing your cursor. A bullet with children targets itself; a leaf bullet targets its nearest foldable parent. When you unfold, the cursor returns to its saved line and column.

- Supports headings, nested bullets, numbered lists, and task lists.
- Remembers positions independently for each section across open files.
- Keeps child sections folded when you unfold their parent.
- Preserves bookmarks across edits, tab switches, and file renames.
- Clears a file’s memory when its last tab closes; restarting or reloading the plugin clears all memory.
- Adds its own command without changing built-in commands, shortcuts, or note contents.

## Install and use

1. Install **BRAT** from Obsidian’s Community plugins.
2. Add `alad/obsidian-smart-fold` in BRAT and select the latest version. A GitHub token normally isn’t needed.
3. Enable **Obsidian Smart Fold**, then assign **Smart toggle fold** a shortcut under **Settings → Hotkeys**, or run it from the command palette.

For manual installation, download `main.js` and `manifest.json` from the [latest release](https://github.com/alad/obsidian-smart-fold/releases/latest) into `.obsidian/plugins/obsidian-smart-fold/`, restart Obsidian, and enable the plugin.

Cursor restoration works through **Smart toggle fold**. With no saved position, unfolding keeps the cursor where it is. With no containing foldable section, the command shows a notice.

Tested in desktop Source mode and Live Preview; mobile is not yet verified. The plugin uses internal editor APIs, so future Obsidian updates may require compatibility changes.

## Development

`main.js` is the source and installable file; no build is required. Check syntax with `node --check main.js`.

Before pushing changes, run both scripts in `tests/` through Obsidian’s developer evaluation command in a disposable test vault with the plugin enabled. They create and clean up temporary notes and test folding, cursor restoration, and memory across files.

To release, update `manifest.json` and `CHANGELOG.md`, then run the **Prepare release** GitHub workflow. Review and publish its draft release to make the update available through BRAT.
