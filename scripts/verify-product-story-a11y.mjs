import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const suites = [
    {
        file: 'src/components/M3Button/M3Button.stories.tsx',
        prefix: 'atoms-m3button',
        names: ['Filled', 'Disabled', 'Loading'],
    },
    {
        file: 'src/components/mui/MuiSliderField/MuiSliderField.stories.tsx',
        prefix: 'molecules-muisliderfield',
        names: ['Default', 'With Help'],
    },
    {
        file: 'src/components/Tenants/AppSettings/PermissionsSettings/DirectInviteSection/DirectInviteSection.stories.tsx',
        prefix: 'tenants-permissions-directinvitesection',
        names: ['Platform Default', 'Platform Forced'],
    },
];

const expected = new Map(
    suites.flatMap(({ file, prefix, names }) =>
        names.map((name) => [`${prefix}--${name.toLowerCase().replaceAll(' ', '-')}`, resolve(file)]),
    ),
);
const artifactRoot = resolve(process.env.VERIFICATION_ARTIFACTS_DIR || 'verification-artifacts');
mkdirSync(artifactRoot, { recursive: true });
const artifacts = mkdtempSync(join(artifactRoot, 'product-a11y-'));
console.log(`Product accessibility evidence: ${artifacts}`);

const names = suites.flatMap((suite) => suite.names);
const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    [
        'run',
        'test:storybook:strict',
        '--',
        ...suites.map((suite) => suite.file),
        '--testNamePattern',
        `^(${names.join('|')})$`,
    ],
    { env: { ...process.env, VERIFICATION_ARTIFACTS_DIR: artifacts }, stdio: 'inherit' },
);
if (result.error) throw result.error;
assert.equal(result.status, 0, 'Strict product accessibility run failed. See the story output and evidence above.');

const runs = readdirSync(artifacts).filter((name) => name.startsWith('run-'));
assert.equal(runs.length, 1, 'Expected one fresh verification run');
const run = join(artifacts, runs[0]);
const read = (file) => readFileSync(join(run, file), 'utf8');
const inventory = JSON.parse(read('inventory.json'));
const provenance = JSON.parse(read('provenance.json'));
assert.ok(inventory.inventoryComplete && inventory.state === 'passed', 'Product story inventory did not finish');
assert.equal(inventory.provenance.runId, provenance.runId, 'Product story run identity mismatch');
const audited = new Set();
for (const line of read('cases.jsonl').trim().split('\n')) {
    const { a11y, file, state } = JSON.parse(line);
    const storyId = a11y?.storyId;
    if (state === 'skipped' && !storyId) continue;
    assert.ok(expected.has(storyId) && expected.get(storyId) === file, `Unexpected product story ${storyId || file}`);
    assert.ok(!audited.has(storyId), `Duplicate audit for ${storyId}`);
    assert.ok(
        state === 'passed' && a11y.profile === 'strict' && a11y.auditCount === 1,
        `Missing strict PASS for ${storyId}`,
    );
    audited.add(storyId);
}
const missing = [...expected.keys()].filter((storyId) => !audited.has(storyId));
assert.equal(missing.length, 0, `Missing strict product audits: ${missing.join(', ')}`);
console.log(
    `Verified one strict browser audit per product story (${audited.size}/${expected.size}) at ${provenance.source.revision}.`,
);
