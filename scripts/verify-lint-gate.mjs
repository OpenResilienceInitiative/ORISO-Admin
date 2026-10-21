import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const controls = [
    {
        name: 'image accessible name',
        filename: 'src/test/antdNoticeCleanup.test.tsx',
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
        filename: 'src/test/antdNoticeCleanup.test.tsx',
        source: "import { screen } from '@testing-library/react';\nscreen.findByRole('button');\n",
        rule: 'testing-library/await-async-queries',
    },
];
const artifacts = path.resolve(process.env.VERIFICATION_ARTIFACTS_DIR || 'verification-artifacts', 'lint-controls');
mkdirSync(artifacts, { recursive: true });
for (const control of controls) {
    const result = spawnSync(
        process.execPath,
        [
            path.resolve('node_modules/eslint/bin/eslint.js'),
            '--stdin',
            '--stdin-filename',
            control.filename,
            '--format',
            'json',
        ],
        { input: control.source, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 },
    );
    writeFileSync(path.join(artifacts, `${control.rule.replace('/', '-')}.json`), result.stdout);
    assert.ifError(result.error);
    const reports = JSON.parse(result.stdout);
    assert.ok(
        reports.flatMap((report) => report.messages).some((message) => message.ruleId === control.rule),
        `${control.name} did not trigger ${control.rule}; stderr: ${result.stderr}`,
    );
}
console.log(
    'Lint gate verified: accessibility, Storybook discovery and asynchronous testing controls all fail for the intended rule.',
);
