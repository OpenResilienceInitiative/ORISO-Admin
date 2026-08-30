# Learnings

Reusable lessons from completed tasks. One concept per entry, newest first, keep each under 5 lines. Promote to AGENTS.md only if it applies to most future tasks.

Format:

```markdown
## YYYY-MM-DD <short title>

-   Context: <task folder or area>
-   Lesson: <what to do differently next time>
```

## 2026-08-30 Prettier every touched file, including Markdown

-   Context: #888 CI failed on `docs/agent-tasks/index.md` (`npx prettier . --check --ignore-unknown`)
-   Lesson: `prettier --check` on source files is not enough. Write-format every path in the commit, including `docs/` and locale JSON.
