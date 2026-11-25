import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { allocateControlInvocation, allocateControlPhase } from './verification-control-invocation.mjs';
import { readVerificationProfile } from './verification-profile.mjs';
import { installedAxeWitness } from './verification-axe-witness.mjs';
import { assertControlPhase, assertAxeWitnessReceipt, assertAxeWitnessPair } from './verification-control-results.mjs';

// Use the normal provider. Broken fixtures live outside source scans and never
// enter the ordinary inventory. Startup/collection failures are not proof.
const root = process.cwd();
const profile = readVerificationProfile();
const invocation = allocateControlInvocation(
    path.resolve(process.env.VERIFICATION_ARTIFACTS_DIR || 'verification-artifacts/controls'),
);
const artifacts = invocation.directory;
const fixture = path.join(root, '.superpowers/verification-controls/controls.stories.tsx');
const witnessFixture = path.join(root, '.superpowers/verification-controls/axe-witness.stories.tsx');
const created = [];
const run = (phase, baselines = [], shuffle = false, options = { profile }) => {
    const { directory, capsule } = allocateControlPhase(invocation, phase, shuffle, options);
    const reportPath = path.join(directory, 'controls.json');
    const startedAtUTC = new Date().toISOString();
    const result = spawnSync(
        process.platform === 'win32' ? 'npm.cmd' : 'npm',
        [
            'run',
            'test:storybook',
            '--',
            capsule.selection === 'axe-witness1' ? witnessFixture : fixture,
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
                ORISO_VERIFICATION_PROFILE: capsule.profile,
                ORISO_CONTROL_INVOCATION_JSON: JSON.stringify(capsule),
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
    return assertControlPhase(directory, phase, result.status, capsule, baselines);
};
try {
    mkdirSync(path.dirname(fixture), { recursive: true });
    for (const [file, template] of [
        [fixture, 'controls'],
        [witnessFixture, 'axe-witness'],
    ]) {
        writeFileSync(file, readFileSync(new URL(`./verification/${template}.stories.txt`, import.meta.url)), {
            flag: 'wx',
        });
        created.push(file);
    }
    if (profile === 'functional-pilot') {
        const witness = {
            contractVersion: 1,
            pairId: invocation.invocationId,
            ...installedAxeWitness(),
            observation: 'attached',
        };
        const positive = run('witness-positive', [], false, { profile: 'strict', selection: 'axe-witness1', witness });
        assertAxeWitnessReceipt(positive);
        const functional = run('witness-functional', [], false, { profile, selection: 'axe-witness1', witness });
        assertAxeWitnessPair(positive, functional);
        const disconnected = run('witness-disconnected', [], false, {
            profile: 'strict',
            selection: 'axe-witness1',
            witness: { ...witness, observation: 'disconnected-negative' },
        });
        assert.deepEqual(disconnected.browser, positive.browser, 'Disconnected browser mismatch');
        assert.deepEqual(disconnected.capsule.source, positive.capsule.source, 'Disconnected source mismatch');
        assert.equal(disconnected.case.a11y?.witness?.invocationCount, 0, 'Negative observer was not disconnected');
        assert.throws(
            () => assertAxeWitnessReceipt(disconnected),
            (error) => error.code === 'ORISO_AXE_CALLSITE_COUNT',
        );
        run('verify');
        run('verify', [], true);
        console.log(
            `Functional pilot verified: matched callsite witness + disconnected negative; 20 functional controls ×2. Compliance DEFERRED/NOT_RUN. Artifacts: ${artifacts}`,
        );
    } else {
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
    }
} finally {
    for (const file of created) unlinkSync(file);
}
