# MERMAID-TOOLKIT

## 🎯 Core Project Goal & Architecture Policy

1. **Upstream First (Pele Delegation)**: This project explicitly delegates all Mermaid-to-SVG parsing, layout, and rendering to [Pele](https://pele.run) (`obsidianmd/pele`), backed by the Obsidian core team. We deliberately avoid maintaining custom SVG renderers or Mermaid JavaScript theming engines.
2. **Minimal Maintenance Surface Area**: Keep the repository surface area as lean as possible (<5 kB bundle). If an upstream tool or standard web primitive can solve a problem (e.g. CSS variables for theming, Pele for SVG compilation), we delegate to it.
3. **Design System Native**: Theming must map directly to native CSS custom properties (`--pele-*`). Zero JavaScript runtime or DOM re-rendering is permitted for theme switches or dark mode.
4. **MDX & Static SSR First**: Provide seamless build-time Markdown/MDX AST transformations (Remark and Rehype plugins) that emit static HTML/SVG with 0 KB client-side JavaScript.
5. **Accessible Dual-Output**: Retain lightweight ASCII/Unicode layout rendering to provide screen-reader fallbacks and `llms.txt` support.

## 🛑 Repository Conventions & Workflow Policy

1. **Squash Merge Only**: All pull requests must be merged into `main` using **Squash and Merge** exclusively.
2. **Delete Branch on Merge**: Feature branches must be automatically deleted immediately upon merge into `main`.
3. **Linear History**: Maintain a strictly linear history. Rebase feature branches onto `main` before merging; no merge commits allowed.
4. **Direct Push Protection**: Non-force direct pushes to `main` are blocked; PR mechanism required (force pushes permitted when needed).
5. **Local Temp & Worktree Directory**: All temporary files, local databases, scratch files, and git worktrees MUST go inside the root `/temp/` directory (gitignored).
6. **Gitignored Local TODO File**: A root `TODO.md` file MUST exist for local task tracking and be gitignored.
