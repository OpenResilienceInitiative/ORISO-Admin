// @vitest-environment node
import { createRequire, Module } from 'node:module';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vite-plus/test';
import {
    backportFieldBuild,
    fieldFormBuilds,
    prepareFieldFormBackport,
    checkFieldFormBackport,
} from './field-form-backport.mjs';

const require = createRequire(import.meta.url);
const fieldFile = require.resolve('antd/node_modules/rc-field-form/lib/Field.js');
const raw = readFileSync(fieldFile, 'utf8');
const warning = require('rc-util/lib/warning');
const field = () => {
    const loaded = new Module(fieldFile);
    loaded.filename = fieldFile;
    loaded.paths = Module._nodeModulePaths(path.dirname(fieldFile));
    loaded._compile(backportFieldBuild(raw, 'lib') + '\nexports.__diagnosticFieldClass = Field;', fieldFile);
    let store = { deadline: '' };
    const context = { getFieldsValue: () => store, getInternalHooks: () => ({ initEntityValue: () => {} }) };
    const instance = new loaded.exports.__diagnosticFieldClass({
        name: ['deadline'],
        fieldContext: context,
        onMetaChange: () => {},
    });
    return {
        instance,
        update(next) {
            store = next;
        },
    };
};
afterEach(() => {
    warning.resetWarned();
    vi.restoreAllMocks();
});
it.each(['initial', 'external-value', 'reset', 'set-field-fallback', 'validation-start'])(
    'uses distinct errors/warnings through actual nested Field metadata: %s',
    async (mode) => {
        const { instance, update } = field();
        let pending;
        if (mode === 'external-value') {
            update({ deadline: 'new' });
            instance.onStoreChange({ deadline: '' }, [['deadline']], {
                type: 'valueUpdate',
                source: 'external',
                store: { deadline: 'new' },
            });
        }
        if (mode === 'reset') instance.onStoreChange({}, [['deadline']], { type: 'reset', store: { deadline: '' } });
        if (mode === 'set-field-fallback')
            instance.onStoreChange({}, [['deadline']], {
                type: 'setField',
                data: { errors: undefined, warnings: undefined },
                store: { deadline: '' },
            });
        if (mode === 'validation-start') pending = instance.validateRules({});
        try {
            const meta = instance.getMeta();
            expect(meta.errors).toEqual([]);
            expect(meta.warnings).toEqual([]);
            expect(meta.errors).not.toBe(meta.warnings);
        } finally {
            await pending;
        }
    },
);
it('does not emit the observed false-cycle warning on actual nested Field setField transition', () => {
    warning.resetWarned();
    const sink = vi.spyOn(console, 'error'); // Preserve the real sink, including the RED warning.
    const { instance } = field();
    instance.triggerMetaEvent();
    instance.onStoreChange({}, [['deadline']], { type: 'setField', data: { errors: [] }, store: { deadline: '' } });
    expect(
        sink.mock.calls.filter((args) =>
            args.some((value) => String(value).includes('There may be circular references')),
        ),
    ).toEqual([]);
});

const hash = (value) => createHash('sha256').update(value).digest('hex');
const originalBuild = (mode) => {
    const current = readFileSync(require.resolve(`antd/node_modules/rc-field-form/${mode}/Field.js`), 'utf8');
    const original = current
        .replace('var EMPTY_WARNINGS = [];\n', '')
        .replace('"warnings", EMPTY_WARNINGS', '"warnings", EMPTY_ERRORS')
        .replaceAll('_this.warnings = EMPTY_WARNINGS;', '_this.warnings = EMPTY_ERRORS;')
        .replace(
            '_this.warnings = data.warnings || EMPTY_WARNINGS;',
            '_this.warnings = data.warnings || EMPTY_ERRORS;',
        );
    expect(hash(original)).toBe(fieldFormBuilds[mode].originalSHA256);
    return original;
};
const installation = () => {
    const root = mkdtempSync(path.join(tmpdir(), 'field-backport-'));
    const antd = path.join(root, 'node_modules/antd');
    const nested = path.join(antd, 'node_modules/rc-field-form');
    mkdirSync(path.join(nested, 'es'), { recursive: true });
    mkdirSync(path.join(nested, 'lib'));
    writeFileSync(path.join(root, 'package.json'), '{}');
    writeFileSync(path.join(antd, 'package.json'), JSON.stringify({ name: 'antd', version: '5.29.3' }));
    writeFileSync(path.join(nested, 'package.json'), JSON.stringify({ name: 'rc-field-form', version: '2.7.1' }));
    for (const mode of ['es', 'lib']) writeFileSync(path.join(nested, mode, 'Field.js'), originalBuild(mode));
    const legacy = path.join(root, 'node_modules/rc-field-form/lib');
    mkdirSync(legacy, { recursive: true });
    writeFileSync(path.join(legacy, 'Field.js'), 'root1.44 untouched sentinel');
    writeFileSync(
        path.join(path.dirname(legacy), 'package.json'),
        JSON.stringify({ name: 'rc-field-form', version: '1.44.0' }),
    );
    return { root, nested, legacy };
};
it('prepares exact ES/CJS outputs idempotently and leaves root field-form untouched', () => {
    const { root, nested, legacy } = installation();
    try {
        expect(() => checkFieldFormBackport(root)).toThrow('npm run prepare:runtime');
        const first = prepareFieldFormBackport(root);
        expect(first.builds.map((row) => row.actualSHA256)).toEqual(
            ['es', 'lib'].map((mode) => fieldFormBuilds[mode].patchedSHA256),
        );
        const bytes = ['es', 'lib'].map((mode) => readFileSync(path.join(nested, mode, 'Field.js'), 'utf8'));
        prepareFieldFormBackport(root);
        expect(['es', 'lib'].map((mode) => readFileSync(path.join(nested, mode, 'Field.js'), 'utf8'))).toEqual(bytes);
        expect(checkFieldFormBackport(root).fieldFormVersion).toBe('2.7.1');
        expect(readFileSync(path.join(legacy, 'Field.js'), 'utf8')).toBe('root1.44 untouched sentinel');
    } finally {
        rmSync(root, { recursive: true });
    }
});
it.each(['source', 'version', 'path'])('fails closed before either build changes: %s', (kind) => {
    const { root, nested } = installation();
    try {
        if (kind === 'source') writeFileSync(path.join(nested, 'lib/Field.js'), originalBuild('lib') + '\n');
        if (kind === 'version') writeFileSync(path.join(nested, 'package.json'), JSON.stringify({ version: '2.7.2' }));
        if (kind === 'path') rmSync(path.join(nested, 'package.json'));
        const before = readFileSync(path.join(nested, 'es/Field.js'), 'utf8');
        expect(() => prepareFieldFormBackport(root)).toThrow();
        expect(readFileSync(path.join(nested, 'es/Field.js'), 'utf8')).toBe(before);
    } finally {
        rmSync(root, { recursive: true });
    }
});
it('retains the original comparator warning for an actual ancestor cycle', () => {
    warning.resetWarned();
    const sink = vi.spyOn(console, 'error');
    const circular = {};
    circular.self = circular;
    const compare = require('rc-util/lib/isEqual').default;
    expect(compare(circular, { self: {} })).toBe(false);
    expect(
        sink.mock.calls.some((args) =>
            args.some((value) => String(value).includes('There may be circular references')),
        ),
    ).toBe(true);
});
