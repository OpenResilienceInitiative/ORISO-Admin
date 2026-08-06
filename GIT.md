# GIT.md — Git & GitHub workflow (ORISO)

How we plan, branch, review, and close work across all ORISO repositories. `AGENTS.md` points here; treat this as the canonical process.

## 1. Issue first — every PR has a parent issue

Do not open a pull request without a parent issue. If none exists, create one first.

**Every issue states three things:**

1. **Why** — the problem, 1–3 sentences (observed behavior, incident, product need).
2. **What** — the change being asked for.
3. **Goal** — the aspiration: what should be true when this is done, phrased as an outcome, plus acceptance criteria. The Goal is what reviewers and QA test against — the why/what explain, the Goal decides.

Then:

-   **Assign it to the ORISO project board** (the org has exactly one). Set the `Priority` and `Effort` fields there.
-   Label it: `bug` for defects, plus triage/refinement labels as appropriate.
-   **Bug fixes stay lightweight**: label `bug`, short Problem/Expected/Goal, no epic ceremony — but the fixing PR is still linked.

## 2. The issue is the cross-repo anchor

Many changes span repositories (admin UI + backend service + deployment). The parent issue is the single place where the whole effort is visible:

-   Create the parent issue in the repo where the problem _manifests_ (use the cross-repo map in `CLAUDE.md` to decide ownership).
-   **Every PR, in every repo, links the parent issue** (`Refs OpenResilienceInitiative/<repo>#<nr>`, or `Closes #<nr>` for the final same-repo PR).
-   **Post each PR as a comment on the parent issue** when you open it ("Admin part: <PR link>", "UserService part: <PR link>"). Anyone reading the issue must be able to find all PRs that solve it without searching.

## 3. Branches

-   `pre-dev` is the integration branch; `dev` is the stable demo environment and human gate; `main` is release. Never commit directly to any of them.
-   Branch from current `origin/pre-dev`: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`, `docs/<topic>`.
-   Follow-up work after your PR merged: start a **fresh branch from `origin/pre-dev`** — never stack commits on an already-merged branch.
-   Force-push on `pre-dev` is allowed only when needed for integration testing before promotion review begins. Force-push is prohibited on `dev` and `main`; after promotion review starts it is also prohibited on `pre-dev`. On your own feature branch it is allowed only before review starts; after review starts, add normal commits.

## 4. Pull requests

-   Target `pre-dev`. One concern per PR; link counterpart PRs in other repos.
-   Description ≤ ~150 words: Problem (1–2 sentences) · Changes (3–6 bullets) · Verification (commands, one line each). No diff narration — AI reviewers re-read the body on every push, so keep it cheap.
-   Reference the parent issue (see §2).
-   Run the repo's validation gates before pushing (this repo: `npm run test`, `npx eslint . --max-warnings=0`, `npx prettier . --check`, `npm run build` — see `AGENTS.md`).

## 5. Human promotion gate: `pre-dev` → `dev`

Feature PRs integrate into `pre-dev`. Promotion to the stable `dev` demo environment requires successful automated checks, a current PreDev E2E artifact, no unresolved migration or rule conflict, a short understandable change summary, and explicit human approval. Do not force-push after review begins.

Production promotion remains a separate gate after `dev`.

## 6. After a PR is merged to `pre-dev`

1. **Prune branches** — on your machine and any other environment you work from:
    ```bash
    git fetch --prune origin
    git branch -d <merged-branch>        # local
    git push origin --delete <branch>    # remote, if not auto-deleted
    ```
2. **Update the parent issue**: confirm the merged PR is linked in the comments.
3. **Move the issue forward on the project board**: if all PRs for it are merged, move it to the post-review/QA status column (verify the exact column name on the board) — or straight to closed for simple bug fixes with nothing left to verify. When closing, set the state reason (`completed` / `not planned`).

An issue is only _done_ when its Goal is verifiably met — merged code alone doesn't close it.
