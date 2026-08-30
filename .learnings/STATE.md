# State

## Verified facts

-   Integration branch for Admin feature PRs is `pre-dev`; `dev` is the stable demo behind the human promotion gate.
-   CI / engines Node is **22.12.0**. Validation commands: `npm run test`, `npm run lint:js`, `npm run lint:css`, `npm run build`.
-   Non-trivial agent work writes a trail under `docs/agent-tasks/YYYY-MM-DD_short-feature-name/`. Only `docs/agent-tasks/*` is gitignored (except `index.md`) unless a task folder is explicitly un-ignored. Other files under `docs/` stay trackable.

## General rules

-   Never implement directly on `pre-dev`. Branch as `cursor/<ticket-or-feature>/<short-slug>`.
-   Reuse existing table, form, query, mutation, role, and validation patterns.
-   Do not paper over 401/403/API failures with UI-only success states.

## Open failures

(none)

## Lessons learned

(none yet — see `LEARNINGS.md` once the first Admin agent task closes)

## Last session

-   2026-08-30: #874 — original ten PRs already on `pre-dev`. Leftovers: live consent dialog icon, unlock/pending wording, template content-language. Branch `cursor/874/legal-review-gaps`.
-   2026-08-29: Scaffolded `.cursor/` agent harness (rules, skills, subagents, hooks), `docs/agent-tasks/index.md`, and `.learnings/` templates.
