# AGENTS.md

## Context First

-   Treat `pre-dev` as the normal integration branch for ORISO Admin feature PRs. `dev` is the stable demo environment behind the human promotion gate.
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
-   All `lint:*` scripts are check-only and never write to the working tree, so they are safe to use as gates. The mutating variants are explicit: `lint:css:fix` and `lint:formatting:fix`.
-   `lint:css` reports `order/properties-order` as a warning. Warnings do not fail the gate; only errors do.
-   If a full command is too expensive or blocked by existing unrelated failures, run the narrowest relevant command and state the blocker precisely.

## Review Expectations

-   Cursor should compare PRs against `origin/pre-dev` for normal ORISO Admin feature work.
-   CodeRabbit is optional/manual and should not be treated as the primary automated reviewer.
-   Automated review should flag missing tests, duplicated admin patterns, unsafe auth/API changes, and mergeability risks.
-   Only auto-fix issues that are clearly scoped and testable. Leave architectural or ambiguous changes as review comments.

## AI agent delivery rules

Binding for every AI coding agent working in this repository. Canonical text and
rationale: `ORISO-Docs/oriso-platform/coding-standards.mdx` (section "AI agent
delivery rules"). Summary:

- **An agent never merges its own pull request.** Not on green CI, not on "finish
  it", not for chores or test-only changes. Delivery ends at: verified → PR open
  with evidence and a reviewer test plan → reviewers requested → issue
  `In review`. Merge only on an explicit, per-PR instruction naming that PR.
- **Request reviewers in the same step that opens the PR.** A PR without
  requested reviewers is not open for review.
- **"Pre-Dev is free" means the server, not the branch.** Deploying images,
  mutating config or data and running E2E on the Pre-Dev server needs no
  approval; the `pre-dev` *branch* is review-gated like any shared branch.
- **Restore what you borrowed.** Record image reference *and* `imagePullPolicy`
  before swapping anything on Pre-Dev, put both back before reporting done, and
  say so in the report.
- **State where it was verified** in every PR body — environment and image, or
  plainly "local only".
