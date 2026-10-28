import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
export const comparatorContract = {
    module: 'rc-util/es/isEqual.js',
    version: '5.44.4',
    sha256: '948fb3cb0ce30edf7a973e9c7a404c89d791cdb97c7737ac2ab386b2d7c0f074',
};
const hash = (value) => createHash('sha256').update(value).digest('hex');
const allowed = (selection) => ['deadline-warning', 'registration-warning'].includes(selection);

// Retain the complete original comparator body; only its export gets a wrapper.
export const instrumentComparator = (source) => {
    assert.equal(hash(source), comparatorContract.sha256, 'Unsupported comparator source');
    assert.equal(source.split('export default isEqual;').length, 2, 'Unsupported comparator export');
    assert.ok(source.includes("warning(!circular, 'Warning: There may be circular references');"));
    const wrapper = `
let diagnosticComparisonId = 0;
const diagnosticMetadata = (value) => {
  if (!value || typeof value !== 'object') return null;
  const fields = Object.getOwnPropertyDescriptors(value);
  const errors = fields.errors?.value, warnings = fields.warnings?.value, name = fields.name?.value;
  if (!Array.isArray(errors) || !Array.isArray(warnings) || !Array.isArray(name)) return null;
  return { errors, warnings, name };
};
export default function diagnosticIsEqual(...args) {
  let left = null, right = null;
  if (args[0] !== args[1]) {
    try { left = diagnosticMetadata(args[0]); right = diagnosticMetadata(args[1]); }
    catch { /* Observation must not replace the comparator's own throw. */ }
  }
  const comparisonId = ++diagnosticComparisonId;
  const field = (meta) => meta && meta.name.length === 1 && ['deadline', 'consultantIds'].includes(meta.name[0]) ? meta.name[0] : 'OTHER_FIELD';
  const side = (meta) => meta ? { field: field(meta), errorsLength: meta.errors.length, warningsLength: meta.warnings.length, errorsWarningsAlias: meta.errors === meta.warnings, errorsNameAlias: meta.errors === meta.name, warningsNameAlias: meta.warnings === meta.name } : null;
  const receipt = { module: ${JSON.stringify(comparatorContract.module)}, sha256: ${JSON.stringify(
        comparatorContract.sha256,
    )}, comparisonId, left: side(left), right: side(right), leftErrorsRightErrorsAlias: !!left && !!right && left.errors === right.errors, leftWarningsRightWarningsAlias: !!left && !!right && left.warnings === right.warnings };
  window.dispatchEvent(new CustomEvent('oriso-fixture-comparison', { detail: { phase: 'enter', receipt } }));
  try { return isEqual(...args); }
  finally { window.dispatchEvent(new CustomEvent('oriso-fixture-comparison', { detail: { phase: 'exit', comparisonId } })); }
}
`;
    return source.replace('export default isEqual;', wrapper);
};
const installed = () => {
    const file = require.resolve(comparatorContract.module);
    assert.equal(
        JSON.parse(readFileSync(require.resolve('rc-util/package.json'), 'utf8')).version,
        comparatorContract.version,
    );
    const source = readFileSync(file, 'utf8');
    return { file, source, transformed: instrumentComparator(source) };
};
export const prepareComparatorProbe = (directory, selection) => {
    assert.ok(allowed(selection), 'Unknown comparator diagnostic selection');
    const folder = path.join(directory, 'comparator-probe');
    mkdirSync(folder);
    const { source, transformed } = installed();
    writeFileSync(path.join(folder, 'original-module.js'), source, { flag: 'wx' });
    writeFileSync(path.join(folder, 'transformed-module.js'), transformed, { flag: 'wx' });
    writeFileSync(
        path.join(folder, 'contract.json'),
        JSON.stringify({ ...comparatorContract, selection, transformedSHA256: hash(transformed) }, null, 2),
        { flag: 'wx' },
    );
};
export const fixtureComparatorProbePlugin = (selection, directory) => {
    if (!selection) return undefined;
    assert.ok(allowed(selection), 'Unknown comparator diagnostic selection');
    const folder = path.join(directory, 'comparator-probe');
    const contract = JSON.parse(readFileSync(path.join(folder, 'contract.json'), 'utf8'));
    const { file, source, transformed } = installed();
    assert.deepEqual(contract, { ...comparatorContract, selection, transformedSHA256: hash(transformed) });
    assert.equal(readFileSync(path.join(folder, 'original-module.js'), 'utf8'), source);
    assert.equal(readFileSync(path.join(folder, 'transformed-module.js'), 'utf8'), transformed);
    let transforms = 0;
    return {
        name: 'oriso-fixture-comparator-diagnostic',
        enforce: 'pre',
        transform(code, id) {
            if (id.split('?')[0] !== file) return undefined;
            assert.equal(code, source, 'Comparator changed before diagnostic interception');
            transforms += 1;
            writeFileSync(
                path.join(folder, 'interception.json'),
                JSON.stringify({ ...contract, resolvedModule: file, transforms }, null, 2),
            );
            return { code: transformed, map: null };
        },
    };
};
