# Agent task trail

One folder per non-trivial task: `docs/agent-tasks/YYYY-MM-DD_short-feature-name/`.

Author, branch, ticket links, and status go **inside** the files, not the folder name. Trivial one-file changes do not need a folder.

By default `docs/agent-tasks/*` is gitignored (see `.gitignore`). To commit a trail, add a negation for that folder. `index.md` is always tracked.

## Standard files

Created as needed — not every file is mandatory for every task.

| File                        | Produced by                            | Purpose                                     |
| --------------------------- | -------------------------------------- | ------------------------------------------- |
| `00-problem-brief.md`       | `problem-intake` skill                 | Goal + acceptance criteria (loop exit test) |
| `01-spike.md`               | `planner` subagent / `spike-doc` skill | Current behavior, gap, chosen approach      |
| `02-implementation-plan.md` | `task-implementation-doc` skill        | Subtask table driving loop iterations       |
| `03-progress-log.md`        | `goal-loop` skill                      | One short entry per loop iteration          |
| `04-test-evidence.md`       | `regression-check` skill               | Final verification results                  |
| `05-security-review.md`     | `security-auditor` subagent            | Touched-scope security findings             |
| `06-pr-summary.md`          | `pr-prep` skill                        | PR-ready package                            |

## Tasks

<!-- newest first: [YYYY-MM-DD_slug](YYYY-MM-DD_slug/00-problem-brief.md) — one-line status -->
