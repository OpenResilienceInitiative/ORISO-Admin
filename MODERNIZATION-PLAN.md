# ORISO-Admin Modernization Plan — React 19.3 + Router + Tests + Storybook

> Local-only. No PRs. Each phase ends with: `vitest run` green + `npm run build` green + app boots locally.
> Worktree: `_worktrees/ORISO-Admin-react19`, branch `chore/admin-react19-modernization` off `origin/dev`.

## Starting point (verified 2026-06-30)

-   React **17.0.2** + ReactDOM `render` (legacy API) in `src/index.tsx`
-   **antd 4.23.4** — the dominant UI lib, used in **92 files** (MUI only in 3)
-   react-router-dom **6.2.1**, react-query **v3** (50 files), draft-js/react-rte (14 files), react-color (1 file)
-   Vite 4, Vitest 0.34, TypeScript 4.1, @testing-library/react 12
-   Tests: **41 files / 140 tests green**, build green. No Storybook.

## The key constraint

**antd v4 does not run on React 19** (uses `findDOMNode`; peer deps cap at React 18). So React 19.3 is _gated_ on an **antd v4 → v5 migration across 92 files** — the single largest piece of this effort, with real visual/theming impact.

De-risking principle: **antd v5 supports React 16–18**, so we migrate antd _while still on React 18_ (both stable), validate, and only then jump to React 19. We never change two risky axes at once.

---

## Phases (each independently testable, local-only)

### Phase 0 — Foundation ✅ DONE

-   Isolated worktree off `origin/dev`; green baseline captured (140 tests + build).

### Phase 1 — Storybook scaffold + safe test density

-   Stand up Storybook (Vite builder + SB latest, mirror Frontend recipe: Atoms/Molecules/Organisms + `@storybook/addon-mcp`). Works on React 17 today.
-   Add **logic-only** tests (utils, hooks, api transforms, state) — these survive every later phase.
-   _Why first:_ visible win, zero coupling to the React/antd risk.

### Phase 2 — React 17 → 18

-   `ReactDOM.render` → `createRoot`; `@testing-library/react` 12 → 14; React 18 types.
-   Bump react-router-dom to latest 6.x.
-   antd 4 + react-query 3 + MUI 5 all support React 18 → contained, low risk.

### Phase 3 — antd v4 → v5 _(the big one — own sub-steps)_

-   Run `@ant-design/codemod-v5`, then manual fixes: ConfigProvider theme tokens (replaces less vars), `message`/`notification`/`Modal` context (App wrapper / hooks), Form API deltas, locale import paths, removed components.
-   Done on React 18. Validate visually screen-by-screen.

### Phase 4 — Dependency swaps for React 19

-   `react-color` (findDOMNode) → `react-colorful`.
-   `react-query` v3 → `@tanstack/react-query` v5.
-   draft-js / react-rte decision (keep vs. swap to a maintained editor) — **needs Frank's call**.
-   MUI → 5.16+ (React 19 support) or v6/v7.

### Phase 5 — React 18 → 19.3 + Router

-   react/react-dom 19.3, `@types/react` 19, `@testing-library/react` 16.
-   react-router v7 (mirror Frontend migration).
-   Validate full app boot + flows.

### Phase 6 — Test density round 2 + Storybook stories

-   Component/integration tests against the final stack.
-   Expand Storybook stories; wire addon-mcp so agents see real Admin components.

## Decisions needed from Frank

1. **antd v4 → v5 in scope?** Unavoidable for React 19; large visual surface. (Recommend: yes, it's the only path.)
2. **Sequencing:** Storybook-first (quick visible win) vs. React-18-first. (Recommend: Storybook-first.)
3. **Rich-text editor** (draft-js/react-rte): keep-and-patch vs. swap to maintained lib. (Decide at Phase 4.)
