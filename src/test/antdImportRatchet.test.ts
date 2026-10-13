import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * ORISO-Admin#1171 — AntD ratchet. ESLint forbids AntD imports everywhere except the files
 * listed in the `.eslintrc.json` override that switches `no-restricted-imports` off. That
 * list may only shrink: a listed file that no longer imports AntD must be removed from it.
 */

// Lower this when files leave the list. Never raise it.
const MAX_BASELINE = 263;

const root = resolve(__dirname, '../..');
// Same scope as ESLint: imports, re-exports and require, exact package names only.
// `vi.mock('antd')` and `typeof import('antd')` are not imports.
const ANTD_IMPORT =
    /(?:^|\n)\s*(?:import|export)\s[^;]*?\bfrom\s*['"](?:antd(?:\/[^'"]*)?|@ant-design\/[^'"]+)['"]|(?:^|\n)\s*import\s*['"](?:antd(?:\/[^'"]*)?|@ant-design\/[^'"]+)['"]|\brequire\(\s*['"](?:antd(?:\/[^'"]*)?|@ant-design\/[^'"]+)['"]/;

const config = JSON.parse(readFileSync(join(root, '.eslintrc.json'), 'utf8'));
const baselineOverride = config.overrides.find(
    (override: { rules?: Record<string, unknown> }) => override.rules?.['no-restricted-imports'] === 'off',
);
const baseline: string[] = baselineOverride?.files ?? [];

const sourceFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return sourceFiles(path);
        return /\.[cm]?[jt]sx?$/.test(name) ? [relative(root, path)] : [];
    });

// This file holds AntD import samples as strings, so it is not scanned itself.
const self = relative(root, __filename);
const importsAntd = (file: string) => file !== self && ANTD_IMPORT.test(readFileSync(join(root, file), 'utf8'));

describe('AntD import ratchet (#1171)', () => {
    it('recognises every way of importing AntD, and nothing else', () => {
        [
            "import { Button } from 'antd';",
            "import 'antd/dist/reset.css';",
            "export { Button } from 'antd';",
            "import type { MenuProps } from 'antd';",
            "import {\n    DeleteOutlined,\n} from '@ant-design/icons';",
            "const antd = require('antd');",
        ].forEach((source) => expect(source).toMatch(ANTD_IMPORT));
        [
            "import x from 'antd-foo';",
            "vi.mock('antd', async () => vi.importActual<typeof import('antd')>('antd'));",
            "import { Button } from '@mui/material';",
        ].forEach((source) => expect(source).not.toMatch(ANTD_IMPORT));
    });

    it('forbids AntD imports as an error for every file', () => {
        const [level, options] = config.rules['no-restricted-imports'];
        expect(level).toBe('error');
        expect(options.paths.map((path: { name: string }) => path.name)).toContain('antd');
        expect(options.patterns.flatMap((pattern: { group: string[] }) => pattern.group)).toEqual(
            expect.arrayContaining(['antd/*', '@ant-design/*']),
        );
    });

    it('lists no file that has stopped importing AntD', () => {
        const stale = baseline.filter((file) => !existsSync(join(root, file)) || !importsAntd(file));
        expect(stale, 'remove these from the AntD list in .eslintrc.json and lower MAX_BASELINE').toEqual([]);
    });

    it('only lets the list shrink', () => {
        expect(baseline.length).toBeGreaterThan(0);
        expect(baseline.length).toBeLessThanOrEqual(MAX_BASELINE);
    });

    it('covers every file that still imports AntD', () => {
        const unlisted = sourceFiles(join(root, 'src')).filter((file) => importsAntd(file) && !baseline.includes(file));
        expect(unlisted, 'new AntD import: use the design-system component instead (#1171)').toEqual([]);
    });
});
