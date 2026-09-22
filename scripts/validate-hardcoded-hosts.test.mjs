import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The postbuild gate is the Admin CI guard against ORISO hosts baked into the bundle
// (ORISO-Helm#368). Tested directly so a pattern cannot be dropped without a red run.

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'validate-hardcoded-hosts.sh');

const runGuardOn = (content, fileName = 'index.js') => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-hosts-guard-'));
    try {
        fs.mkdirSync(path.join(dir, 'assets'));
        fs.writeFileSync(path.join(dir, 'assets', fileName), content);
        return spawnSync('bash', [script, dir], { encoding: 'utf8' });
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
};

describe('validate-hardcoded-hosts.sh', () => {
    it.each([
        'https://app.oriso.org',
        'app.oriso.org',
        'https://admin.oriso-dev.site/admin',
        'https://matrix.oriso.site',
        'http://localhost',
    ])('fails the build when the bundle contains %s', (host) => {
        const result = runGuardOn(`const u = "${host}";`);
        expect(result.status, result.stderr).toBe(1);
        expect(result.stderr).toContain('Hardcoded deployment value');
    });

    it('passes a bundle that only uses example hosts', () => {
        const result = runGuardOn('const u = "https://app.example.org";');
        expect(result.status, result.stderr).toBe(0);
    });

    it('ignores source maps, which embed comments', () => {
        const result = runGuardOn('// app.oriso.org', 'index.js.map');
        expect(result.status, result.stderr).toBe(0);
    });
});
