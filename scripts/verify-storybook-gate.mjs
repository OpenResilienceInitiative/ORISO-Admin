import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertControlPhase } from './verification-control-results.mjs';

// Use the normal provider. Broken fixtures live outside source scans and never
// enter the ordinary inventory. Startup/collection failures are not proof.
const root = process.cwd();
const artifacts = path.resolve(process.env.VERIFICATION_ARTIFACTS_DIR || 'verification-artifacts/controls');
const fixture = path.join(root, '.superpowers/verification-controls/controls.stories.tsx');
mkdirSync(path.dirname(fixture), { recursive: true });
mkdirSync(artifacts, { recursive: true });
writeFileSync(fixture, readFileSync(new URL('./verification/controls.stories.txt', import.meta.url)), { flag: 'wx' });
const run = (phase, baselines = [], shuffle = false) => {
    const directory = path.join(artifacts, phase + (shuffle ? '-shuffled' : ''));
    mkdirSync(directory, { recursive: true });
    const reportPath = path.join(directory, 'controls.json');
    const startedAtUTC = new Date().toISOString();
    const result = spawnSync(
        process.platform === 'win32' ? 'npm.cmd' : 'npm',
        [
            'run',
            'test:storybook',
            '--',
            fixture,
            '--reporter=./scripts/verification-reporter.mjs',
            '--reporter=json',
            `--outputFile=${reportPath}`,
            ...(shuffle ? ['--sequence.shuffle.tests', '--sequence.seed=1611'] : []),
        ],
        {
            cwd: root,
            env: {
                ...process.env,
                VERIFICATION_ARTIFACTS_DIR: directory,
                ORISO_VERIFICATION_CONTROLS: 'true',
                ORISO_A11Y_CONTROL_PHASE: phase,
                ORISO_A11Y_BASELINE_JSON: JSON.stringify(baselines),
            },
            encoding: 'utf8',
            timeout: 180_000,
            maxBuffer: 20 * 1024 * 1024,
        },
    );
    appendFileSync(
        path.join(artifacts, 'phase-processes.jsonl'),
        `${JSON.stringify({
            phase,
            shuffle,
            cwd: root,
            command: 'npm run test:storybook with argv recorded in controls.log',
            childPid: result.pid,
            startedAtUTC,
            endedAtUTC: new Date().toISOString(),
            exitCode: result.status,
            error: result.error?.message,
        })}\n`,
    );
    writeFileSync(path.join(directory, 'controls.log'), `${result.stdout || ''}\n${result.stderr || ''}`);
    assert.ifError(result.error);
    return assertControlPhase(directory, phase, result.status);
};
try {
    const captured = run('capture');
    const baselines = captured
        .filter((test) => /--known-/.test(test.a11y?.storyId))
        .map(({ a11y }) => ({
            storyId: a11y.storyId,
            environment: a11y.environment,
            fingerprints: a11y.fingerprints,
            owner: 'verification-selftest',
            issue: 'https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/1228',
            expires: '2099-01-01',
        }));
    assert.equal(baselines.length, 4);
    assert.ok(
        baselines.every((entry) => entry.fingerprints?.length > 0),
        'Each control must capture real axe violations',
    );
    writeFileSync(path.join(artifacts, 'selftest-only-baselines.json'), JSON.stringify(baselines, null, 2));
    const verified = run('verify', baselines);
    const contrastNode = (cases) =>
        cases
            .find((test) => test.a11y?.storyId.endsWith('--known-worse-style'))
            .a11y.reports[0].result.violations.find((rule) => rule.id === 'color-contrast').nodes[0];
    const before = contrastNode(captured);
    const after = contrastNode(verified);
    assert.equal(after.html, before.html, 'CSS regression control must retain identical markup');
    assert.deepEqual(after.target, before.target);
    assert.notDeepEqual(
        after.any[0].data,
        before.any[0].data,
        'Actual axe check colors must reflect stylesheet-only worsening',
    );
    run('verify', baselines, true);
    console.log(
        `Storybook gate verified: 20 controls ×3 runs (all 19 original controls retained), strict unknown stories, approved unchanged audit, new-node/CSS regression, independent errors and shuffled identity. Artifacts: ${artifacts}`,
    );
} finally {
    unlinkSync(fixture);
}
