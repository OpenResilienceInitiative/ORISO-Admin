import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { validateControlCapsule } from './verification-profile.mjs';

const require = createRequire(import.meta.url);
const hash = (value) => createHash('sha256').update(value).digest('hex');
export const callsiteSignature = 'axe.run(context, optionsWithDisabledRules)';
const runnerRelative = './_browser-chunks/chunk-5WURYCET.js';
const pinnedAddonHash = '0e9751fb5459103c79562d33617b7e8773deeeaa04a49c40ca9ec9afa4fab5d7';
const pinnedAxeHash = '15197c63ff683f76f7e544a266b239c7bb003fa8e2c904c32434d0e9ff6575de';
const readerSignature = 'export const readInstalledAxeWitness = () => undefined;';

export const installedAxeWitness = (root = process.cwd()) => {
    const preview = require.resolve('@storybook/addon-a11y/preview');
    const entry = readFileSync(preview, 'utf8');
    assert.equal(entry.split(`from "${runnerRelative}"`).length - 1, 1, 'Installed preview runner import changed');
    const runner = realpathSync(path.resolve(path.dirname(preview), runnerRelative));
    const axePath = realpathSync(createRequire(runner).resolve('axe-core'));
    const identity = (name, file) => ({
        version: JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8')).version,
        resolvedRelativePath: path.relative(root, file),
        sha256: hash(readFileSync(file)),
    });
    const addon = { ...identity('@storybook/addon-a11y', runner), callsiteSignature };
    const axe = identity('axe-core', axePath);
    assert.equal(addon.version, '10.6.3', 'Unreviewed addon version');
    assert.equal(addon.sha256, pinnedAddonHash, 'Installed addon source changed');
    assert.equal(axe.version, '4.12.1', 'Unreviewed axe version');
    assert.equal(axe.sha256, pinnedAxeHash, 'Installed axe source changed');
    return { addon, axe };
};

// The only write to the private counter is injected immediately at the actual
// installed callsite. Read-only exports cannot manufacture a positive receipt.
export const instrumentAxeCallsite = (source, capsule) => {
    validateControlCapsule(capsule);
    assert.equal(source.split(callsiteSignature).length - 1, 1, 'Expected exactly one installed axe callsite');
    assert.equal(hash(source), capsule.witness.addon.sha256, 'Served addon source differs from pinned identity');
    const receipt = {
        ...capsule.witness,
        invocationId: capsule.invocationId,
        phase: capsule.phase,
        source: capsule.source,
    };
    const increment = capsule.witness.observation === 'attached' ? '__orisoAxeCalls += 1' : 'void 0';
    return `let __orisoAxeCalls = 0;\nexport const readOrisoAxeWitness = () => ({ ...${JSON.stringify(
        receipt,
    )}, moduleLoaded: true, invocationCount: __orisoAxeCalls });\n${source.replace(
        callsiteSignature,
        `(${increment}, ${callsiteSignature})`,
    )}`;
};

export const axeWitnessPlugin = (capsule) => {
    const witness = capsule?.selection === 'axe-witness1';
    if (witness) {
        validateControlCapsule(capsule);
        const installed = installedAxeWitness();
        assert.deepEqual(installed.addon, capsule.witness.addon, 'Capsule addon mismatch');
        assert.deepEqual(installed.axe, capsule.witness.axe, 'Capsule axe mismatch');
    }
    const runner = witness ? realpathSync(path.resolve(capsule.witness.addon.resolvedRelativePath)) : undefined;
    return {
        name: 'oriso-installed-axe-witness',
        enforce: 'pre',
        transform(source, id) {
            if (!witness) return undefined;
            const file = id.split('?')[0];
            if (file === path.resolve('.storybook/axeWitness.ts')) {
                assert.equal(source.split(readerSignature).length - 1, 1, 'Witness reader signature changed');
                return {
                    code: source.replace(
                        readerSignature,
                        `export { readOrisoAxeWitness as readInstalledAxeWitness } from ${JSON.stringify(runner)};`,
                    ),
                    map: null,
                };
            }
            if (file !== runner) return undefined;
            return { code: instrumentAxeCallsite(source, capsule), map: null };
        },
    };
};
