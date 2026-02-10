# Preserving code versions

To keep a fixed version of your code so you don’t lose it:

## Option 1: Git commit + tag (recommended)

From the project root (`healthcare-app`):

```bash
git add .
git status
git commit -m "Version: landing with Contact Us, chat on /chat, white & royal blue theme, form validations"
git tag v1.0-contact-and-chat-page
```

- **Restore this version later:**  
  `git checkout v1.0-contact-and-chat-page`  
  (or create a new branch from it:  
  `git checkout -b my-branch v1.0-contact-and-chat-page`)

- **List tags:**  
  `git tag -l`

## Option 2: Branch per version

Before big changes:

```bash
git checkout -b version/contact-us-and-chat-page
git add .
git commit -m "Snapshot before next changes"
```

Switch back anytime with:  
`git checkout version/contact-us-and-chat-page`

## Option 3: Zip backup

From the parent of `healthcare-app`:

```bash
# Windows (PowerShell)
Compress-Archive -Path Healthcare_frontend -DestinationPath Healthcare_frontend_backup_2025-02-10.zip
```

Keep the zip somewhere safe; restore by unzipping and renaming if needed.

---

**In this codebase:** Chat lives on the **/chat** page (not on the landing page). The landing page has a **Contact Us** section. Book appointment and contact forms have **validations**. The theme is **white and royal blue**. All of this is preserved in the current code; use Git or backups above to lock in a version before future edits.
