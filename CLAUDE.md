# CLAUDE.md — ORISO Admin

This file is the **access gate** for AI-assisted work on this repo. Read it first, then follow the pointers — don't re-derive repo knowledge from scratch.

## Where to look first

1. `.understand-anything/README.md` → entry point to the generated knowledge graph (architecture, onboarding, findings, `knowledge-graph.json`).
2. `.understand-anything/meta.json` → **check `gitCommitHash` against `origin/pre-dev` before trusting the graph.** If it is more than a few dozen commits behind, treat the Markdown summaries as orientation only and verify against the code.
3. `AGENTS.md` → working rules (integration branch = `pre-dev`, stable demo = `dev`, validation commands, review expectations).
4. `GIT.md` → Git/GitHub workflow: issue-first PRs, ORISO project board, cross-repo issue anchoring, post-merge hygiene.
5. `docs/` → feature-specific task docs.

## Cross-repo map (where does an issue live?)

Many issues span repositories. This admin app is only the control plane; the actual behavior usually lives in a backend service. Route by concern:

| Concern                                                                            | Repository                                      |
| ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| Login, JWT/roles, consultants, user admin (`/service/users`, `/service/useradmin`) | `ORISO-UserService`                             |
| Agencies (`/service/agencies`, agency admin)                                       | `ORISO-AgencyService`                           |
| Tenants, tenant settings, multitenancy resolution (`/service/tenant*`)             | `ORISO-TenantService`                           |
| Consulting types, topics (`/service/consultingtypes`, `/service/topic*`)           | `ORISO-ConsultingTypeService`                   |
| Counseling UI that advice seekers/consultants use                                  | `ORISO-Frontend`                                |
| Admin dashboard (this repo, served under `/admin`)                                 | `ORISO-Admin`                                   |
| Deployment (cluster, ingress, service wiring)                                      | `ORISO-Kubernetes`, `ORISO-Helm`, `ORISO-Infra` |
| Cross-service end-to-end tests                                                     | `ORISO-E2E`                                     |
| Architecture decision records and platform docs                                    | `ORISO-Docs`                                    |
| Observability (tracing/metrics)                                                    | `ORISO-SignOZ`                                  |

Archived (do not target with new work): `ORISO-Keycloak`, `ORISO-Database`, `ORISO-Redis`, `ORISO-Matrix`, `ORISO-Element`, `ORISO-Nginx`, `ORISO-Debian`.

Rule of thumb: a bug reproducible with `curl` against `/service/...` belongs in the owning service repo; if it only reproduces through the admin UI, it belongs here. Cross-repo fixes should link their counterpart PRs.

## Error-handling conventions (this repo)

-   The app is wrapped in `src/components/ErrorBoundary` (app-level in `src/index.tsx`, page-level in `src/App.tsx`). New code must still not rely on it: degrade, don't throw.
-   `src/utils/parseJWT.ts` returns `null` for malformed tokens — never assume token claims exist (`payload?.realm_access?.roles ?? []`).
-   Transport errors are string codes from `FETCH_ERRORS` (`src/api/fetchData.ts`); user-facing messages go through i18n keys (`message.error.*`), never raw server strings.
-   Differentiate failure causes at the UI: "no access" ≠ "wrong credentials" ≠ "server unreachable" (see `LoginForm.tsx` / `useLoginMutation.hook.ts`).

## PR descriptions

Keep them short — they are read by humans and re-read by AI reviewers on every push:

-   Problem (1–2 sentences), what changed (3–6 bullets), verification (commands run, one line each).
-   Target ~150 words. No restating the diff, no per-file narration, no architecture essays — link an ADR or issue instead.

## Validation

`npm run test`, `npx eslint . --max-warnings=0`, `npx prettier . --check`, `npm run build` (see `AGENTS.md` for scope-narrowing guidance).
