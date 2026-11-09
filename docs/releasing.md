# Releasing a new version

Every release ships two files: the installer (`AimTrainer-Setup.exe`) and the portable app
(`AimTrainer.exe`). Releases are built on the maintainer's PC, because the build needs the
game files in `site/`.

## Steps

1. **Update the changelog.** In `CHANGELOG.md`, add a section at the top:

   ```markdown
   ## [1.1.0] - 2026-11-02

   ### Added
   - 6 jiggle-peek drills on Bind (#41, thanks @tapfrag)

   ### Fixed
   - FPS meter 1% low no longer resets when the menu opens (#38)
   ```

2. **Bump the version** in `app/package.json` (`"version": "1.1.0"`).
3. **Build:**

   ```bash
   cd app
   npm run build
   ```

4. **Test the installer** from `app/dist/` on your PC: install, start, play one round,
   and check that your history is still there.
5. **Commit and tag:**

   ```bash
   git commit -am "chore: release 1.1.0"
   git tag v1.1.0
   git push origin main --follow-tags
   ```

6. **Publish on this fork's GitHub page:** [hygef-v4/open-aim releases](https://github.com/hygef-v4/open-aim/releases) → Draft a new release → choose tag `v1.1.0`.
   Paste the changelog section as the notes, and attach `AimTrainer-Setup.exe` and
   `AimTrainer.exe` from `app/dist/`.

The README links to this fork's releases page. Source builds remain available before
the first fork installer is published.

## Version numbers

`MAJOR.MINOR.PATCH`:
- **PATCH** (1.0.**1**): bug fixes only.
- **MINOR** (1.**1**.0): new drills, tools or features.
- **MAJOR** (**2**.0.0): something that changes how players' saved data works.
