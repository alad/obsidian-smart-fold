# Obsidian Smart Fold

Run **Obsidian Smart Fold: Smart toggle fold**, or assign it a shortcut in Settings → Hotkeys. The plugin does not override Obsidian commands or assign hotkeys.

## Cursor memory

- Folding saves the cursor position separately for that heading, then moves the cursor to the heading.
- Unfolding with Smart toggle fold restores that heading’s saved cursor position and consumes that bookmark. The next fold saves your new position.
- Nested and sibling headings have independent bookmarks. Unfolding a parent leaves its folded children folded.
- Bookmarks follow edits that insert or remove text before them. Deleted headings lose their bookmarks, and destinations outside the current section are ignored.
- With no saved bookmark (for example, a heading folded using the gutter), unfolding keeps the current cursor position.
- Each open file has its own memory, shared across its tabs. Switching tabs or renaming a file preserves bookmarks. Closing the last tab for a file clears its memory; reopening it starts fresh. Disabling/reloading the plugin or quitting Obsidian also clears memory. Nothing is saved to disk.

The live editor syntax tree identifies document headings, including Setext headings, while ignoring code. Before the first heading, the command shows a notice. Note text is never rewritten.

No build step or dependencies to install. Access to the editor CodeMirror instance is an internal API; an Obsidian update may require a compatibility adjustment.

## Install with BRAT

After the first release is published, install BRAT from Obsidian’s Community plugins, add `alad/obsidian-smart-fold`, and select the latest version. Public repository downloads normally need no GitHub token.

For manual installation, download `main.js` and `manifest.json` from a release into `.obsidian/plugins/obsidian-smart-fold/`, restart Obsidian, and enable the plugin.

## Development and releases

`main.js` is the source and the installable file; no build is required. Obsidian supplies the imported modules at runtime. This plugin uses internal editor APIs and has been tested in desktop Obsidian; mobile behavior is not yet verified.

Run `node --check main.js` for syntax validation. `tests/obsidian-integration.js` is an integration test to execute with Obsidian's developer evaluation command in a disposable test vault, with the plugin enabled. It creates temporary notes and tabs, tests cursor restoration across files, and deletes only its own test notes afterward.

For a release, update the manifest version and changelog, run the integration test, then manually run the **Prepare release** workflow. It creates a draft release with the installable files attached. Review the draft before publishing it for BRAT users.
