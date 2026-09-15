# Obsidian Smart Fold

**Fold a section from wherever you’re writing. Unfold it to pick up where you left off.**

Obsidian’s built-in toggle-fold command works on the current line. Smart Fold finds the heading containing your cursor, folds that section, and remembers your exact cursor position. Unfold it with the same command to return to that line and column.

## Example

You’re editing a bullet under `## Tasks`:

```markdown
# Project

## Tasks
- Review the proposal
- Write feedback ← cursor here
```

Run **Smart toggle fold**:

1. The Tasks section collapses.
2. Your cursor moves to `## Tasks`.
3. Run it again: Tasks expands and your cursor returns to where you were writing feedback.

## Each heading remembers its own position

Nested sections work independently. Fold a subsection, move up into its parent section, and fold that too. Unfolding the parent returns you to the position saved for the parent, while the subsection stays folded. Unfold the subsection to return to its saved position.

Cursor memory also works across open files:

- Switching tabs preserves saved positions.
- Inserting or removing text above a saved position moves the bookmark with it.
- Renaming an open file preserves its bookmarks.
- Closing a file’s last tab clears its memory.
- Quitting Obsidian or disabling/reloading the plugin clears all memory.

Everything stays in memory—nothing is written into your notes or saved between sessions.

## Install with BRAT

1. Install and enable **BRAT** from Obsidian’s Community plugins.
2. In BRAT, choose **Add a beta plugin for testing**.
3. Enter `alad/obsidian-smart-fold` and select the latest version.
4. Enable **Obsidian Smart Fold** if it isn’t already enabled.

This is a public repository, so a GitHub token normally isn’t needed.

### Manual installation

Download `main.js` and `manifest.json` from the [latest release](https://github.com/alad/obsidian-smart-fold/releases/latest). Place both files inside your vault at:

```text
.obsidian/plugins/obsidian-smart-fold/
```

Restart Obsidian and enable the plugin under **Settings → Community plugins**.

## Use it

Run **Obsidian Smart Fold: Smart toggle fold** from the command palette.

For quicker access, go to **Settings → Hotkeys**, search for **Smart toggle fold**, and assign your preferred shortcut.

The plugin adds its own command. It does not change Obsidian’s built-in fold command or assign a shortcut automatically.

## Behavior and limitations

- Works from paragraphs, bullet lists, and code blocks within a heading’s section.
- Recognizes Markdown headings, including underlined Setext headings, and ignores heading-like text inside code blocks.
- Before the first heading, it shows a notice and leaves the cursor where it is.
- If a heading has no saved position—for example, you folded it using the gutter—unfolding keeps the current cursor position.
- Cursor restoration applies when unfolding with **Smart toggle fold**.
- Updating the plugin reloads it and clears its temporary cursor memory.
- Tested in desktop Obsidian. Mobile behavior has not yet been verified.

## Development

`main.js` is both the source and the installable plugin file. No build step is required; Obsidian provides the imported modules at runtime.

Check syntax with:

```sh
node --check main.js
```

The integration test in `tests/obsidian-integration.js` runs inside Obsidian with the plugin enabled. Use a disposable test vault. It creates temporary notes and tabs, checks nested folding and cursor memory across files, and cleans up its test notes afterward.

The plugin accesses Obsidian’s internal editor interface, so future Obsidian updates may require compatibility changes.

### Releases

Update the manifest version and changelog, run the integration test, then manually run the **Prepare release** workflow on GitHub. It creates a draft release with the installable files attached.

Review and publish the draft to make the version available through BRAT.
