import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';
import { compareLegacyButtonUsage, countLegacyButtons, readLegacyButtonUsage } from './verify-legacy-buttons.mjs';

const legacyFile = 'src/components/CreateAgencyModal/index.tsx';
const legacyForm = "import { Form, Button as LegacyButton } from 'antd';\n";
const oldAction = 'export const Action = () => <LegacyButton />;\n';
assert.equal(countLegacyButtons(legacyForm + oldAction, legacyFile), 2);
assert.equal(countLegacyButtons('/* eslint-disable */\n' + legacyForm + oldAction, legacyFile), 2);
assert.equal(
    countLegacyButtons(legacyForm + 'export const Action = () => <LegacyButton>Action</LegacyButton>;', legacyFile),
    2,
);
const moreLegacy = countLegacyButtons(
    legacyForm + oldAction + 'export const Extra = () => <LegacyButton />;',
    legacyFile,
);
assert.deepEqual(compareLegacyButtonUsage({ [legacyFile]: moreLegacy }, { [legacyFile]: 2 }), [
    { file: legacyFile, allowed: 2, found: 3 },
]);
assert.deepEqual(compareLegacyButtonUsage({ [legacyFile]: 2 }, { [legacyFile]: 2 }), []);
assert.deepEqual(compareLegacyButtonUsage({}, { [legacyFile]: 2 }), [{ file: legacyFile, allowed: 2, found: 0 }]);
assert.equal(countLegacyButtons("export { default as OldAction } from 'antd/es/button';", legacyFile), 1);
assert.equal(
    countLegacyButtons(
        "import { Form } from 'antd';\nimport { M3Button } from '../M3Button';\nexport { Form, M3Button };",
        legacyFile,
    ),
    0,
);

const controls = [
    {
        name: 'image accessible name',
        filename: 'src/test/storyRenderCleanup.test.tsx',
        source: 'export const MissingAlt = () => <img src="/mark.svg" />;\n',
        rule: 'jsx-a11y/alt-text',
    },
    {
        name: 'Storybook discovery',
        filename: 'src/components/M3Button/M3Button.stories.tsx',
        source: 'export const NoDefault = {};\n',
        rule: 'storybook/default-exports',
    },
    {
        name: 'awaited asynchronous query',
        filename: 'src/test/storyRenderCleanup.test.tsx',
        source: "import { screen } from '@testing-library/react';\nscreen.findByRole('button');\n",
        rule: 'testing-library/await-async-queries',
    },
    {
        name: 'aliased AntD slider alongside a legacy form',
        artifact: 'slider-named-import',
        filename: 'src/pages/Agency/Edit/components/AgencySettings/index.tsx',
        source: "import { Form, Slider as Range } from 'antd';\nexport { Form, Range };\n",
        rule: 'no-restricted-imports',
        message: 'MuiSliderField',
    },
    {
        name: 'AntD slider re-export from a subpath',
        artifact: 'slider-subpath-export',
        filename: 'src/pages/Agency/Edit/components/AgencySettings/index.tsx',
        source: "export { default as Range } from 'antd/es/slider';\n",
        rule: 'no-restricted-imports',
        message: 'MuiSliderField',
    },
    {
        name: 'legacy form with the shared slider',
        artifact: 'shared-slider',
        filename: 'src/pages/Agency/Edit/components/AgencySettings/index.tsx',
        source: "import { Form } from 'antd';\nimport { MuiSliderField } from '../../../../../components/mui/MuiSliderField';\nexport { Form, MuiSliderField };\n",
        rule: 'no-restricted-imports',
        allowed: true,
    },
];
const artifacts = path.resolve(process.env.VERIFICATION_ARTIFACTS_DIR || 'verification-artifacts', 'lint-controls');
mkdirSync(artifacts, { recursive: true });
const eslint = new ESLint();
for (const control of controls) {
    const reports = await eslint.lintText(control.source, { filePath: control.filename });
    writeFileSync(
        path.join(artifacts, `${control.artifact ?? control.rule.replace('/', '-')}.json`),
        JSON.stringify(reports),
    );
    assert.equal(reports.length, 1, `${control.name} did not produce a lint report`);
    const messages = reports.flatMap((report) => report.messages);
    assert.ok(
        messages.every((message) => !message.fatal),
        `${control.name} did not parse`,
    );
    const violations = messages.filter((message) => message.ruleId === control.rule);
    if (control.allowed) {
        assert.deepEqual(violations, [], `${control.name} unexpectedly triggered ${control.rule}`);
        continue;
    }
    assert.ok(
        violations.some((message) => message.severity === 2 && message.message.includes(control.message || '')),
        `${control.name} did not trigger ${control.rule}`,
    );
}
const buttonUsage = readLegacyButtonUsage('src');
const budgetFile = 'scripts/legacy-button-usage.json';
const allowedButtonUsage = JSON.parse(readFileSync(budgetFile, 'utf8'));
const buttonViolations = compareLegacyButtonUsage(buttonUsage, allowedButtonUsage);
const baseSha = process.env.VERIFICATION_LINT_BASE_SHA;
let baselineIncreases = [];
if (baseSha) {
    assert.match(baseSha, /^[a-f0-9]{40}$/, 'Expected the PR base commit for legacy button verification');
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
    // On the first rollout the baseline file does not exist on the base branch.
    if (git('ls-tree', baseSha, '--', budgetFile).trim()) {
        const previous = JSON.parse(git('show', `${baseSha}:${budgetFile}`));
        baselineIncreases = compareLegacyButtonUsage(allowedButtonUsage, previous).filter(
            ({ allowed, found }) => found > allowed,
        );
    }
}
writeFileSync(
    path.join(artifacts, 'legacy-buttons.json'),
    JSON.stringify({ buttonUsage, buttonViolations, baselineIncreases }),
);
assert.deepEqual(baselineIncreases, [], 'The legacy Ant Design button count may only decrease. Use M3Button.');
assert.deepEqual(
    buttonViolations,
    [],
    'Use M3Button from src/components/M3Button for Admin actions. See https://dev.oriso.org/storybook-admin/?path=/story/atoms-m3button--filled. Lower the legacy count when migrating an existing action.',
);
console.log('Lint gate verified: accessibility, Storybook, asynchronous queries, sliders and legacy buttons.');
