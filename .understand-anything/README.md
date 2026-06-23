# ORISO Admin Knowledge Graph

Generated for the current repository only: `ORISO-Admin`.

## Navigation

- [Architecture Summary](./ARCHITECTURE.md)
- [Developer Onboarding](./ONBOARDING.md)
- [ORISO Ecosystem Connection](./ORISO-ECOSYSTEM.md)
- [Findings and Risks](./FINDINGS.md)
- [Dependency Audit](./DEPENDENCY-AUDIT.md)
- [Visual Artifacts](./visuals/)
- [Knowledge Graph JSON](./knowledge-graph.json)

## Current Graph

- Latest analyzed commit: `1a367cd463191425e4ee61f02ec5f1a35d6b02bf`
- Analyzed at: `2026-06-12T02:52:58.608Z`
- Files analyzed: `527`
- Nodes: `1091`
- Edges: `1614`
- Layers: `13`
- Tour steps: `7`

File categories:

```json
{
  "infra": 5,
  "config": 17,
  "code": 384,
  "docs": 9,
  "script": 3,
  "markup": 109
}
```

Node types:

```json
{
  "file": 492,
  "config": 15,
  "pipeline": 5,
  "document": 9,
  "resource": 3,
  "service": 3,
  "function": 500,
  "class": 2,
  "endpoint": 62
}
```

## Graph Outputs

```bash
.understand-anything/knowledge-graph.json
.understand-anything/fingerprints.json
.understand-anything/meta.json
.understand-anything/config.json
```

## Open The Dashboard

From this repository root:

```bash
PROJECT_DIR="$(pwd)"
cd "$UNDERSTAND_ANYTHING_DASHBOARD"
GRAPH_DIR="$PROJECT_DIR" pnpm exec vite --host 127.0.0.1
```

Set `UNDERSTAND_ANYTHING_DASHBOARD` to your local Understand-Anything `packages/dashboard` directory.

Use the full dashboard URL printed by Vite, including the `?token=...` query string. The dashboard will not load this graph from the ORISO Admin app URL.

## Updating The Graph

Auto-update is enabled in `.understand-anything/config.json`:

```json
{
  "autoUpdate": true
}
```

If the local environment does not run the Understand-Anything auto-update hook, rebuild after meaningful changes with:

```bash
/understand . --full
```
