import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Merged upstream PR650 / b5eaf88b48b33b27595a4beaa37ee19309462959, six hunks.
export const fieldFormBuilds = {
    es: {
        originalSHA256: 'c64ae93ee962623eb4907745aec4a6ed3b36d933211ff94d96a72f608aeabc24',
        patchedSHA256: 'c11bde99661f30a3ec3ec3f3f2fac18090e87514d91816885435bac666c1218f',
    },
    lib: {
        originalSHA256: '7a1c1f0de81d4e319fdfe032ed3f0d9bc005e2c2b067f04605d79a669dcffe9b',
        patchedSHA256: '5bd44055e1d9ba8febf4627ccf8adb70416e5c32547455e6a9aff394e8d49ac3',
    },
};
const hash = (value) => createHash('sha256').update(value).digest('hex');
export const backportFieldBuild = (source, mode) => {
    assert.ok(Object.hasOwn(fieldFormBuilds, mode), 'Unknown field-form build');
    assert.ok(
        [fieldFormBuilds[mode].originalSHA256, fieldFormBuilds[mode].patchedSHA256].includes(hash(source)),
        'Unknown field-form source hash',
    );
    if (hash(source) === fieldFormBuilds[mode].patchedSHA256) return source;
    const replacements = [
        ['var EMPTY_ERRORS = [];', 'var EMPTY_ERRORS = [];\nvar EMPTY_WARNINGS = [];', 1],
        ['"warnings", EMPTY_ERRORS', '"warnings", EMPTY_WARNINGS', 1],
        ['_this.warnings = EMPTY_ERRORS;', '_this.warnings = EMPTY_WARNINGS;', 3],
        ['_this.warnings = data.warnings || EMPTY_ERRORS;', '_this.warnings = data.warnings || EMPTY_WARNINGS;', 1],
    ];
    let patched = source;
    for (const [before, after, count] of replacements) {
        assert.equal(patched.split(before).length - 1, count, 'Upstream field-form hunk mismatch');
        patched = patched.replaceAll(before, after);
    }
    assert.equal(hash(patched), fieldFormBuilds[mode].patchedSHA256, 'Unexpected field-form patch output');
    return patched;
};

const inspect = (cwd) => {
    const root = realpathSync(cwd);
    const localRequire = createRequire(path.join(root, 'package.json'));
    const antdPackage = localRequire.resolve('antd/package.json');
    assert.equal(
        realpathSync(antdPackage),
        path.join(root, 'node_modules/antd/package.json'),
        'Unexpected AntD install path',
    );
    assert.equal(
        JSON.parse(readFileSync(antdPackage, 'utf8')).version,
        '5.29.3',
        'Unknown AntD version; review backport retirement',
    );
    const formPackage = createRequire(antdPackage).resolve('rc-field-form/package.json');
    const expectedPackage = path.join(root, 'node_modules/antd/node_modules/rc-field-form/package.json');
    assert.equal(realpathSync(formPackage), expectedPackage, 'Unexpected active field-form path');
    assert.equal(
        JSON.parse(readFileSync(formPackage, 'utf8')).version,
        '2.7.1',
        'Unknown field-form version; review backport retirement',
    );
    return ['es', 'lib'].map((mode) => {
        const file = path.join(path.dirname(expectedPackage), mode, 'Field.js');
        assert.ok(lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink(), 'Unexpected field-form build file');
        assert.equal(realpathSync(file), file, 'Unexpected field-form build path');
        const before = readFileSync(file, 'utf8');
        return { mode, file, before, after: backportFieldBuild(before, mode) };
    });
};
const receipt = (plans) => ({
    integration: 'field-form-shared-empty-metadata',
    upstreamCommit: 'b5eaf88b48b33b27595a4beaa37ee19309462959',
    antdVersion: '5.29.3',
    fieldFormVersion: '2.7.1',
    builds: plans.map((plan) => ({
        mode: plan.mode,
        path: `node_modules/antd/node_modules/rc-field-form/${plan.mode}/Field.js`,
        beforeSHA256: hash(plan.before),
        actualSHA256: hash(readFileSync(plan.file)),
        ...fieldFormBuilds[plan.mode],
    })),
});
export const checkFieldFormBackport = (cwd = process.cwd()) => {
    try {
        const plans = inspect(cwd);
        assert.ok(
            plans.every((plan) => plan.before === plan.after),
            'Reviewed field-form backport is not prepared',
        );
        return receipt(plans);
    } catch (error) {
        throw new Error(
            `Admin runtime preparation failed: ${error.message}. Run "npm run prepare:runtime" after install; unknown versions/hashes require review, not automatic patching.`,
        );
    }
};
export const prepareFieldFormBackport = (cwd = process.cwd()) => {
    const plans = inspect(cwd); // Validate BOTH builds before the first write.
    for (const plan of plans) if (plan.before !== plan.after) writeFileSync(plan.file, plan.after);
    checkFieldFormBackport(cwd);
    return receipt(plans);
};
