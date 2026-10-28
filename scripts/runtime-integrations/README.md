# Reviewed form metadata integration

AntD 5.29.3 resolves its own rc-field-form 2.7.1. That package shares one empty
array between field errors and warnings. During a normal metadata transition,
rc-util sees the repeated reference and reports a circular reference. Fresh
Storybook probes confirmed this for `deadline` and `consultantIds`.

`field-form-backport.mjs` backports the six merged upstream changes from
[field-form PR 650](https://github.com/react-component/field-form/pull/650),
commit `b5eaf88b48b33b27595a4beaa37ee19309462959`. It introduces a separate
`EMPTY_WARNINGS` constant at initialization and every warning reset/fallback.
The exact nested ES and CJS artifacts are pinned by original and patched hashes.
Root rc-field-form 1.44 and the comparator remain untouched. Application-supplied
aliases or cycles still reach the original comparator and console gate.

`npm run prepare:runtime` explicitly applies and checks this first-party
integration. Private project `postinstall` invokes the same helper for ordinary
installs. CI and the Storybook Docker build retain `npm ci --ignore-scripts`,
then invoke preparation explicitly. Vite, Vitest and Storybook configuration
imports only check the prepared bytes; they never write dependencies. After an
install with scripts disabled, run preparation before invoking those tools.

Preparation rejects unknown paths, versions and source hashes before modifying
either build. A future dependency upgrade requires reviewing whether to retire
this backport or update the pinned integration. Do not relax the hashes or mute
the warning. The tests exercise actual nested Field metadata transitions through
a test-only class accessor; mounted component/browser proof remains a separate
gate. Runtime preparation receipts record both actual build hashes in
`verification-artifacts/runtime-integrations/field-form-650.json`.
