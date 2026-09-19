# AGENTS.md

## Context First

-   Treat `dev` as the normal integration branch for ORISO Admin feature PRs.
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
-   After editing, run `npx prettier --write` on the touched paths. CI runs `npx prettier . --check --ignore-unknown` and fails on unformatted Markdown and JSON, not only source.
-   `lint:css` reports `order/properties-order` as a warning. Warnings do not fail the gate; only errors do.
-   If a full command is too expensive or blocked by existing unrelated failures, run the narrowest relevant command and state the blocker precisely.

## Review Expectations

-   Cursor should compare PRs against `origin/dev` for normal ORISO Admin feature work.
-   CodeRabbit is optional/manual and should not be treated as the primary automated reviewer.
-   Automated review should flag missing tests, duplicated admin patterns, unsafe auth/API changes, and mergeability risks.
-   Only auto-fix issues that are clearly scoped and testable. Leave architectural or ambiguous changes as review comments.

## AI agent delivery rules

Binding for every AI coding agent working in this repository. Canonical text and
rationale: `ORISO-Docs/oriso-platform/coding-standards.mdx` (section "AI agent
delivery rules"). Summary:

-   **An agent never merges its own pull request.** Not on green CI, not on "finish
    it", not for chores or test-only changes. Delivery ends at: verified → PR open
    with evidence and a reviewer test plan → reviewers requested → issue
    `In review`. Merge only on an explicit, per-PR instruction naming that PR.
-   **Request reviewers in the same step that opens the PR.** A PR without
    requested reviewers is not open for review.
-   **"Pre-Dev is free" means the server, not the branch.** Deploying images,
    mutating config or data and running E2E on the Pre-Dev server needs no
    approval; the `dev` _branch_ is review-gated like any shared branch.
-   **Restore what you borrowed.** Record image reference _and_ `imagePullPolicy`
    before swapping anything on Pre-Dev, put both back before reporting done, and
    say so in the report.
-   **State where it was verified** in every PR body — environment and image, or
    plainly "local only".

## Writing issues and pull requests

Binding for every AI agent. These rules govern *where* text goes and *whose*
text may be changed. They do not relax the delivery rules above.

- **Machine detail belongs in fenced code blocks.** Scanner output, dependency
  trees, stack traces, failing job logs, resolved versions, config excerpts: put
  them inside a fenced block. A human skimming the ticket must be able to skip
  the block and still understand the point. Prose outside the block stays short
  and in plain language.
- **Write findings into the description, not into another comment.** A comment
  is for a decision or a question that needs a person. Analysis, cause, status
  and evidence belong in the issue or pull request description, where the next
  reader finds them without scrolling a thread. Prefer updating the description
  over adding a third, fourth, fifth comment.
- **Lead with the business or end-user effect.** Before any technical detail,
  two or three plain sentences: what does not work for whom, and what that
  costs. Write it so a non-engineer stakeholder can act on it. English, short.
- **You may edit descriptions — but not everyone's.**

  | Description author | May an agent rewrite it? |
  | --- | --- |
  | `Storypapst`, `kiodreambau` | Yes — rewrite, restructure, correct, extend |
  | `BjoernLudwig`, `HelenaSKloeckner`, any other human | No — leave their wording untouched; append a clearly separated section below it |

- **Adding an analysis to someone's bug report** — the ticket says "X is
  broken" and you found out why:
  1. Keep the original report as written.
  2. Add the plain-language cause, two or three sentences.
  3. Put the technical evidence under it, in a code block.
  4. Link the pull request, run or ticket that proves it.
  If the description was corrected rather than extended, say so in one line so
  the change is not silent.
- **Link the ticket you found.** If an issue already covers the problem,
  reference it rather than restating it, and add your findings there.
- **Duplicates: decide, never leave both drifting.** Name in the description
  which ticket survives. A ticket that came back from Caritas — raised by
  `BjoernLudwig` or `HelenaSKloeckner` — is the one that stays open. Close the
  agent-created duplicate against it and link the survivor.
