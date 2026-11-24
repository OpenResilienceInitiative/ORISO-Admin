import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';

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
console.log('Lint gate verified: accessibility, Storybook, asynchronous queries and shared slider controls.');
