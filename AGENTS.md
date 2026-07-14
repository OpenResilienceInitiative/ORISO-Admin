# AGENTS.md

## Context First

-   Treat `dev` as the normal integration branch for ORISO Admin feature PRs unless the task says otherwise.
-   **Follow `GIT.md` for the full Git/GitHub workflow**: parent issue first (Why/What/Goal, assigned to the ORISO project board), PRs linked in the issue comments, branch pruning and board updates after merge.
-   Before non-trivial changes, skim `.understand-anything/README.md`, `.understand-anything/ARCHITECTURE.md`, and `.understand-anything/knowledge-graph.json` for fast repo context.
-   Keep admin behavior aligned with ORISO service contracts and role/permission boundaries.

## Admin Rules

-   Reuse existing table, form, query, mutation, role, and validation patterns instead of adding local one-off flows.
-   Preserve auth and permission semantics. Do not paper over 401/403/API failures with UI-only success states.
-   Reuse existing design tokens and components. Avoid hardcoded styling for repeated controls, table states, or responsive layout.
-   UI changes need accessible focus/keyboard behavior and should not rely on color alone.

## Validation

-   Prefer red-green TDD for behavior changes: add or update the smallest test that would fail without the fix, then implement.
-   Useful commands:
    -   `npm run test`
    -   `npm run lint:js`
    -   `npm run lint:css`
    -   `npm run build`
-   If a full command is too expensive or blocked by existing unrelated failures, run the narrowest relevant command and state the blocker precisely.

## Review Expectations

-   Cursor should compare PRs against `origin/dev` for normal ORISO Admin feature work.
-   CodeRabbit is optional/manual and should not be treated as the primary automated reviewer.
-   Automated review should flag missing tests, duplicated admin patterns, unsafe auth/API changes, and mergeability risks.
-   Only auto-fix issues that are clearly scoped and testable. Leave architectural or ambiguous changes as review comments.
