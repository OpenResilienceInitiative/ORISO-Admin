import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import allowed from './antdBaseline.allowed.json';

/*
 * ORISO-Admin#1171 — AntD ratchet. ESLint forbids AntD imports everywhere except the files
 * listed in the `.eslintrc.json` override that drops the blanket AntD ban. That list may only
 * shrink: a listed file that no longer imports AntD must be removed from it, and no file may
 * join it. `antdBaseline.allowed.json` freezes the permitted set, so swapping a migrated file
 * for a new AntD importer also fails.
 */

// Lower this when files leave the list. Never raise it.
// 292 = one-time re-snapshot on 2026-11-27: 263 (Oct 13) - 49 files that dropped AntD + 78 added on dev
// before this gate merged. The 78 are listed as follow-ups in ORISO-Admin#1171.
const MAX_BASELINE = 292;

const root = resolve(__dirname, '../..');
const ANTD_MODULE = /^(?:antd(?:\/.*)?|@ant-design\/.+)$/;

// Same scope as ESLint: imports, re-exports, `import x = require()` and `require()`, exact
// package names only. Comments, strings, `vi.mock('antd')` and `typeof import('antd')` do not count.
const importsAntdSource = (source: string, fileName = 'sample.tsx'): boolean => {
    const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
    const isAntd = (node: ts.Node | undefined) => !!node && ts.isStringLiteralLike(node) && ANTD_MODULE.test(node.text);
    const visit = (node: ts.Node): boolean => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            if (isAntd(node.moduleSpecifier)) return true;
        } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
            if (isAntd(node.moduleReference.expression)) return true;
        } else if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === 'require' &&
            isAntd(node.arguments[0])
        ) {
            return true;
        }
        return ts.forEachChild(node, visit) ?? false;
    };
    return visit(file);
};

type NoRestrictedImports = ['error', { paths: { name: string; importNames?: string[] }[]; patterns: object[] }];

const config = JSON.parse(readFileSync(join(root, '.eslintrc.json'), 'utf8'));
const rootRule: NoRestrictedImports = config.rules['no-restricted-imports'];
const isBlanketPath = (path: { name: string; importNames?: string[] }) => path.name === 'antd' && !path.importNames;
const baselineOverride = config.overrides.find((override: { rules?: Record<string, NoRestrictedImports> }) => {
    const rule = override.rules?.['no-restricted-imports'];
    return Array.isArray(rule) && !rule[1].paths.some(isBlanketPath);
});
const baseline: string[] = baselineOverride?.files ?? [];
const permitted = new Set<string>(allowed);

const sourceFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return sourceFiles(path);
        return /\.[cm]?[jt]sx?$/.test(name) ? [relative(root, path)] : [];
    });

const importsAntd = (file: string) => importsAntdSource(readFileSync(join(root, file), 'utf8'), file);

describe('AntD import ratchet (#1171)', () => {
    it('recognises every way of importing AntD, and nothing else', () => {
        [
            "import { Button } from 'antd';",
            "import 'antd/dist/reset.css';",
            "export { Button } from 'antd';",
            "export * from 'antd';",
            "import type { MenuProps } from 'antd';",
            "import {\n    DeleteOutlined,\n} from '@ant-design/icons';",
            "const antd = require('antd');",
            "import Legacy = require('antd/es/button');",
        ].forEach((source) => expect(importsAntdSource(source), source).toBe(true));
        [
            "import x from 'antd-foo';",
            "vi.mock('antd', async () => vi.importActual<typeof import('antd')>('antd'));",
            "import { Button } from '@mui/material';",
            "/*\nimport { Button } from 'antd';\n*/",
            "// import { Button } from 'antd';",
            'const sample = "import { Button } from \'antd\';";',
            "const sample = `const antd = require('antd');`;",
        ].forEach((source) => expect(importsAntdSource(source), source).toBe(false));
    });

    it('forbids AntD imports as an error for every file', () => {
        const [level, options] = rootRule;
        expect(level).toBe('error');
        expect(options.paths.some(isBlanketPath)).toBe(true);
        expect(options.patterns.flatMap((pattern) => (pattern as { group: string[] }).group)).toEqual(
            expect.arrayContaining(['antd/*', '@ant-design/*']),
        );
    });

    it('exempts listed files only from the blanket ban, not from the other import rules', () => {
        expect(baselineOverride, 'AntD baseline override in .eslintrc.json').toBeDefined();
        const [, rootOptions] = rootRule;
        const [level, options] = baselineOverride.rules['no-restricted-imports'] as NoRestrictedImports;
        const blanketPatterns = (pattern: object) =>
            (pattern as { group: string[] }).group.some((group) => ['antd/*', '@ant-design/*'].includes(group));
        expect(level).toBe('error');
        expect(options).toEqual({
            paths: rootOptions.paths.filter((path) => !isBlanketPath(path)),
            patterns: rootOptions.patterns.filter((pattern) => !blanketPatterns(pattern)),
        });
    });

    it('lists no file that has stopped importing AntD', () => {
        const stale = [...new Set([...baseline, ...permitted])].filter(
            (file) => !existsSync(join(root, file)) || !importsAntd(file),
        );
        expect(
            stale,
            'remove these from the AntD list in .eslintrc.json and antdBaseline.allowed.json, and lower MAX_BASELINE',
        ).toEqual([]);
    });

    it('only lets the list shrink', () => {
        expect(permitted.size).toBeLessThanOrEqual(MAX_BASELINE);
        expect(
            baseline.filter((file) => !permitted.has(file)),
            'new AntD exemption: use the design-system component instead (#1171)',
        ).toEqual([]);
    });

    it('covers every file that still imports AntD', () => {
        const unlisted = sourceFiles(join(root, 'src')).filter(
            (file) => file !== relative(root, __filename) && importsAntd(file) && !baseline.includes(file),
        );
        expect(unlisted, 'new AntD import: use the design-system component instead (#1171)').toEqual([]);
    });
});
