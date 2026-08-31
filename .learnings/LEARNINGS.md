# Learnings

Reusable lessons from completed tasks. One concept per entry, newest first, keep each under 5 lines. Promote to AGENTS.md only if it applies to most future tasks.

Format:

```markdown
## YYYY-MM-DD <short title>

-   Context: <task folder or area>
-   Lesson: <what to do differently next time>
```

## 2026-08-30 sibling unused i18n keys

-   Context: `docs/agent-tasks/2026-08-30_678-dead-global-settings/`
-   Lesson: When deleting dead translation keys for a retired section, grep the same family (`navTitle` next to `pageTitle` / `tabs.*`) and the English manual JSON — they often have zero code references too.
