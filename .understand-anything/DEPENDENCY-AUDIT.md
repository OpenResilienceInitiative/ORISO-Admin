# Dependency Audit

Command run:

```bash
npm audit --omit=dev --audit-level=moderate
```

Result:

- Total production advisories: `26`
- Moderate: `7`
- High: `18`
- Critical: `1`

## Critical

- `@babel/traverse <7.23.2`
  - Advisory: arbitrary code execution when compiling crafted malicious code.
  - Suggested audit fix: `npm audit fix`

## High

- `axios <=0.31.0`
  - Multiple advisories including CSRF, SSRF/credential leakage, prototype pollution gadgets, DoS, and header injection chains.
  - npm suggests `npm audit fix --force`, upgrading to `axios@1.16.1`, which is breaking.
  - This repo declares `axios@^0.25.0`; review usage before upgrading.

- `immutable <3.8.3`
  - Prototype pollution advisory.
  - Pulled through Draft.js / React-RTE related dependencies.

- `lodash <=4.17.23` and `lodash-es <=4.17.23`
  - Prototype pollution and code injection advisories.

- `lodash.set`
  - Prototype pollution advisory.
  - npm reports no fix available.
  - Direct usage found in `src/components/Tenants/LegalSettings/components/LegalText/index.tsx`.

- `minimatch <=3.1.3`
  - ReDoS advisories.

## Moderate

- `@babel/helpers <7.26.10`
- `@babel/runtime <7.26.10`
- `brace-expansion <=1.1.12`
- `follow-redirects <=1.15.11`
- `react-router >=6.0.0 <6.30.2`
- `react-router-dom` through vulnerable `react-router`
- `yaml 1.0.0 - 1.10.2`

## Recommendation

Do not run `npm audit fix --force` blindly. Treat this as a planned dependency upgrade:

1. Upgrade non-breaking audit fixes first.
2. Separately test Axios 1.x migration.
3. Replace `lodash.set` directly.
4. Evaluate whether Draft.js / React-RTE can be retired in favor of the existing TipTap editor path.
5. Run `npm run build`, `npm run lint`, and Cypress smoke tests after dependency changes.

