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

## Graph Outputs

```bash
.understand-anything/knowledge-graph.json
.understand-anything/fingerprints.json
.understand-anything/meta.json
.understand-anything/config.json
```

Current graph size:

- Files analyzed: `458`
- Nodes: `776`
- Edges: `1,547`
- Layers: `13`
- Tour steps: `6`

## Open The Dashboard

From this repository root:

```bash
PROJECT_DIR="$(pwd)"
cd "$UNDERSTAND_ANYTHING_DASHBOARD"
GRAPH_DIR="$PROJECT_DIR" pnpm exec vite --host 127.0.0.1
```

Set `UNDERSTAND_ANYTHING_DASHBOARD` to your local Understand-Anything `packages/dashboard` directory.

The access token is printed in the terminal when the dashboard starts. Use the full line that starts with `Dashboard URL`, for example:

```bash
http://127.0.0.1:5173/?token=<token>
```

## Updating The Graph

Auto-update is enabled in `.understand-anything/config.json`:

```json
{
  "autoUpdate": true
}
```

The equivalent setup command is:

```bash
/understand . --auto-update
```

If the local environment does not run the Understand-Anything auto-update hook, rebuild after meaningful changes with:

```bash
/understand . --full
```

