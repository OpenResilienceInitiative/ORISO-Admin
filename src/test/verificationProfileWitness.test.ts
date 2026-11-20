// @vitest-environment node
/* eslint-disable import/extensions */
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vite-plus/test';
// eslint-disable-next-line import/extensions
import {
    readVerificationProfile,
    readControlInvocation,
    validateControlCapsule,
} from '../../scripts/verification-profile.mjs';
// eslint-disable-next-line import/extensions
import { allocateControlInvocation, allocateControlPhase } from '../../scripts/verification-control-invocation.mjs';
// eslint-disable-next-line import/extensions
import {
    installedAxeWitness,
    instrumentAxeCallsite,
    axeWitnessPlugin,
    callsiteSignature,
} from '../../scripts/verification-axe-witness.mjs';
// eslint-disable-next-line import/extensions
import { assertAxeWitnessReceipt, assertAxeWitnessPair } from '../../scripts/verification-control-results.mjs';
// eslint-disable-next-line import/extensions
import { suppliedBrowser, createRunProvenance } from '../../scripts/verification-provenance.mjs';

const roots: string[] = [];
afterEach(() => {
    roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
    vi.unstubAllEnvs();
});
const source = { revision: 'current', snapshot: { digest: 'current-tree' } };
const capsule = (phase = 'witness-positive') => ({
    invocationId: 'current-invocation',
    phase,
    shuffle: false,
    profile: phase === 'witness-functional' ? 'functional-pilot' : 'strict',
    selection: 'axe-witness1',
    source,
    witness: {
        contractVersion: 1,
        pairId: 'pair-current',
        ...installedAxeWitness(),
        observation: phase === 'witness-disconnected' ? 'disconnected-negative' : 'attached',
    },
});
const browser = {
    name: 'chromium',
    version: '149.1',
    userAgent: 'Chrome/149.1',
    provider: 'playwright',
    instance: 'chromium',
    locale: 'de-DE',
    timezone: 'Europe/Berlin',
    viewport: [1024, 768, 1],
};
const receipt = (phase = 'witness-positive') => {
    const control = capsule(phase);
    const functional = phase === 'witness-functional';
    return {
        capsule: control,
        browser: { ...browser },
        case: {
            state: 'passed',
            errors: [],
            a11y: {
                profile: control.profile,
                auditCount: functional ? 0 : 1,
                compliance: functional
                    ? { status: 'DEFERRED', execution: 'NOT_RUN', reason: 'pilot scope' }
                    : undefined,
                witness: {
                    ...control.witness,
                    invocationId: control.invocationId,
                    phase,
                    source,
                    moduleLoaded: true,
                    invocationCount: phase === 'witness-positive' ? 1 : 0,
                },
                reports: functional
                    ? []
                    : [
                          {
                              version: 1,
                              status: 'passed',
                              result: {
                                  testEngine: { name: 'axe-core', version: control.witness.axe.version },
                                  testEnvironment: { userAgent: browser.userAgent },
                                  violations: [],
                                  incomplete: [],
                                  inapplicable: [],
                                  passes: [{ id: 'oriso-callsite-witness', nodeCount: 1 }],
                              },
                          },
                      ],
            },
        },
    };
};
it('defaults only missing profile to strict and rejects empty or unknown inputs', () => {
    expect(readVerificationProfile({})).toBe('strict');
    expect(readVerificationProfile({ ORISO_VERIFICATION_PROFILE: 'functional-pilot' })).toBe('functional-pilot');
    ['', 'functional', 'STRICT', ' strict '].forEach((value) =>
        expect(() => readVerificationProfile({ ORISO_VERIFICATION_PROFILE: value })).toThrow(),
    );
});
it('binds Node profile to the canonical capsule in configuration and provenance', () => {
    const control = capsule('witness-functional');
    const env = { ORISO_VERIFICATION_CONTROLS: 'true', ORISO_CONTROL_INVOCATION_JSON: JSON.stringify(control) };
    expect(() => readControlInvocation(env)).toThrow('profile mismatch');
    expect(readControlInvocation({ ...env, ORISO_VERIFICATION_PROFILE: 'functional-pilot' })).toEqual(control);
    expect(() => readControlInvocation({ ORISO_VERIFICATION_CONTROLS: 'true' })).toThrow();
    vi.stubEnv('ORISO_VERIFICATION_CONTROLS', 'true');
    vi.stubEnv('ORISO_CONTROL_INVOCATION_JSON', JSON.stringify(control));
    expect(() => createRunProvenance({ runId: 'run', projects: [], inputs: [] })).toThrow('profile mismatch');
});
it('allocates valid witness and functional phases exclusively and rejects invalid combinations before allocation', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'profile-phases-'));
    roots.push(root);
    const invocation = allocateControlInvocation(root);
    const { witness } = capsule();
    expect(() => allocateControlPhase(invocation, 'capture', false, { profile: 'functional-pilot' })).toThrow(
        'strict only',
    );
    expect(allocateControlPhase(invocation, 'capture').capsule).toMatchObject({
        profile: 'strict',
        selection: 'controls20',
    });
    ['witness-positive', 'witness-functional', 'witness-disconnected'].forEach((phase) => {
        const control = capsule(phase);
        const options = { profile: control.profile, selection: control.selection, witness: control.witness };
        expect(allocateControlPhase(invocation, phase, false, options).capsule.witness).toEqual(control.witness);
        expect(() => allocateControlPhase(invocation, phase, false, options)).toThrow();
    });
    expect(allocateControlPhase(invocation, 'verify', true, { profile: 'functional-pilot' }).capsule.profile).toBe(
        'functional-pilot',
    );
    expect(() => validateControlCapsule({ ...capsule(), selection: 'custom-path' })).toThrow();
    expect(() => validateControlCapsule({ ...capsule(), shuffle: true })).toThrow();
    expect(() => validateControlCapsule({ ...capsule(), profile: 'functional-pilot', witness })).toThrow();
});
it('records actual navigator identity without axe and rejects conflicting raw identity', () => {
    expect(suppliedBrowser({ verificationBrowser: browser })).toEqual(browser);
    expect(suppliedBrowser({})).toBeUndefined();
    expect(() =>
        suppliedBrowser({
            verificationBrowser: browser,
            verificationA11y: { reports: [{ result: { testEnvironment: { userAgent: 'other' } } }] },
        }),
    ).toThrow('identity mismatch');
});
it('accepts a matched witness and rejects the healthy disconnected observer for the counter alone', () => {
    expect(() => assertAxeWitnessPair(receipt(), receipt('witness-functional'))).not.toThrow();
    expect(() => assertAxeWitnessReceipt(receipt('witness-disconnected'))).toThrow(
        expect.objectContaining({ code: 'ORISO_AXE_CALLSITE_COUNT' }),
    );
    const missingRaw = receipt('witness-disconnected');
    missingRaw.case.a11y.reports = [];
    expect(() => assertAxeWitnessReceipt(missingRaw)).toThrow(
        expect.not.objectContaining({ code: 'ORISO_AXE_CALLSITE_COUNT' }),
    );
});
it.each(['source', 'pair', 'module', 'provider', 'browser', 'phase', 'run', 'loaded', 'counter', 'raw', 'sentinel'])(
    'rejects unmatched or incomplete witness: %s',
    (kind) => {
        const positive = receipt();
        const functional = receipt('witness-functional');
        if (kind === 'source') functional.capsule.source = { ...source, revision: 'old' };
        if (kind === 'pair') functional.capsule.witness.pairId = 'old';
        if (kind === 'module') functional.capsule.witness.addon.sha256 = 'a'.repeat(64);
        if (kind === 'provider') functional.browser.provider = 'other';
        if (kind === 'browser') functional.browser.version = 'old';
        if (kind === 'phase') functional.capsule.phase = 'witness-positive';
        if (kind === 'run') functional.capsule.invocationId = 'old';
        if (kind === 'loaded') functional.case.a11y.witness.moduleLoaded = false;
        if (kind === 'counter') functional.case.a11y.witness.invocationCount = 1;
        if (kind === 'raw') positive.case.a11y.reports[0].result.testEnvironment.userAgent = 'other';
        if (kind === 'sentinel') positive.case.a11y.reports[0].result.passes = [];
        expect(() => assertAxeWitnessPair(positive, functional)).toThrow();
    },
);
it('instruments only the resolved installed source, preserving its call exactly once', () => {
    const control = capsule();
    const file = path.resolve(control.witness.addon.resolvedRelativePath);
    const code = readFileSync(file, 'utf8');
    const plugin = axeWitnessPlugin(control);
    expect(plugin.transform(code, `${file}.optimized.js`)).toBeUndefined();
    const output = plugin.transform(code, file).code;
    // Identity metadata also names the callsite; executable source still contains it once.
    expect(output.split('\n').slice(2).join('\n').split(callsiteSignature)).toHaveLength(2);
    expect(output).toContain(`(__orisoAxeCalls += 1, ${callsiteSignature})`);
    expect(() => instrumentAxeCallsite(code.replace(callsiteSignature, 'axe.run(other)'), control)).toThrow(
        'exactly one',
    );
    expect(() => instrumentAxeCallsite(`${code}\n${callsiteSignature}`, control)).toThrow('exactly one');
    expect(() => instrumentAxeCallsite(`${code}\n// changed`, control)).toThrow('source differs');
});
it('the injected callsite preserves arguments, return value and thrown engine errors exactly once', async () => {
    const code = `export const run = (axe, context, optionsWithDisabledRules) => ${callsiteSignature};`;
    const control = capsule();
    control.witness.addon.sha256 = createHash('sha256').update(code).digest('hex');
    const transformed = instrumentAxeCallsite(code, control);
    const mod = await import(
        /* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`
    );
    const result = { passes: ['original'] };
    const context = {};
    const options = {};
    const run = vi.fn(() => result);
    expect(mod.run({ run }, context, options)).toBe(result);
    expect(run).toHaveBeenCalledExactlyOnceWith(context, options);
    expect(mod.readOrisoAxeWitness().invocationCount).toBe(1);
    const failure = new Error('engine rejected');
    run.mockImplementation(() => {
        throw failure;
    });
    expect(() => mod.run({ run }, context, options)).toThrow(failure);
    expect(mod.readOrisoAxeWitness().invocationCount).toBe(2);
    expect(mod).not.toHaveProperty('increment');
});

it('keeps ordinary Storybook reader inert and requires the exact witness reader signature', () => {
    const file = path.resolve('.storybook/axeWitness.ts');
    const code = readFileSync(file, 'utf8');
    expect(axeWitnessPlugin(undefined).transform(code, file)).toBeUndefined();
    expect(axeWitnessPlugin(capsule()).transform(code, file).code).toContain(
        'readOrisoAxeWitness as readInstalledAxeWitness',
    );
    expect(() => axeWitnessPlugin(capsule()).transform(code.replace('() => undefined', '() => 0'), file)).toThrow(
        'reader signature',
    );
});
