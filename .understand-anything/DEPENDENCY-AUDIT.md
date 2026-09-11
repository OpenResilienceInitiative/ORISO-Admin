# Dependency Audit

> **Historical snapshot (June 2026).** This document is a point-in-time audit and has not been re-run. File counts, versions and findings refer to the June 2026 state of the repository.

Command run during this graph refresh:

```bash
npm audit --omit=dev --audit-level=moderate
```

Result:

- Total production advisories: `26`
- Moderate: `7`
- High: `18`
- Critical: `1`
- This graph refresh records dependency risk context only; it does not apply automated fixes.

## Known High-Risk Areas To Recheck

- `@babel/traverse <7.23.2` has a critical arbitrary-code-execution advisory. npm reports a non-force `npm audit fix` path.
- `axios <=0.31.1` has multiple high-severity advisories. npm suggests `npm audit fix --force`, which would install `axios@1.17.0` and is breaking for this repo.
- Draft.js / React-RTE / Immutable remain legacy rich-text/editor dependencies while TipTap is also present. npm reports breaking remediation through `react-rte`.
- `lodash`, `lodash-es`, and direct `lodash.set` usage carry high-severity advisories; npm reports no fix for `lodash.set`.
- `react-router >=6.0.0 <6.30.2` has a moderate external-redirect advisory affecting the current `react-router-dom` dependency chain.

## Recommendation

Do not run `npm audit fix --force` blindly. Treat dependency remediation as a planned upgrade:

1. Run `npm audit --omit=dev --audit-level=moderate` on the review machine.
2. Upgrade non-breaking audit fixes first.
3. Separately test Axios 1.x migration.
4. Retire unused legacy rich-text dependencies if TipTap fully replaces them.
5. Run `npm run build`, `npm run lint`, and a Cypress smoke path after dependency changes.
