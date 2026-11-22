import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';

// ORISO-Helm#368: the Admin container refuses to start without an API URL and names the variable,
// instead of shipping an env.js that makes the browser guess its own origin.

const entrypoint = path.join(path.dirname(fileURLToPath(import.meta.url)), 'docker-entrypoint.sh');

const runEntrypoint = (env) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-entrypoint-'));
    const envFile = path.join(dir, 'env.js');
    try {
        const result = spawnSync('sh', [entrypoint], {
            encoding: 'utf8',
            timeout: 20000,
            // AUTH_BFF_PORT 1 cannot be bound, so a run that gets past the config check stops at the BFF.
            env: { PATH: process.env.PATH, RUNTIME_ENV_FILE: envFile, AUTH_BFF_PORT: '1', ...env },
        });
        return { ...result, envJs: fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : null };
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
};

describe('Admin image payload', () => {
    it('keeps the two BFF modules outside the document root', () => {
        const dockerfile = fs.readFileSync(path.resolve(path.dirname(entrypoint), '../Dockerfile'), 'utf8');
        expect(dockerfile).not.toMatch(/^COPY\s+scripts\/?\s/m);
        expect(dockerfile).toContain(
            'COPY scripts/auth-bff-server.mjs scripts/auth-bff-handlers.mjs /opt/oriso/admin-auth-bff/',
        );
        expect(fs.readFileSync(entrypoint, 'utf8')).toContain('node /opt/oriso/admin-auth-bff/auth-bff-server.mjs');
    });
});

describe('Admin docker-entrypoint runtime config', () => {
    it.each([{}, { VITE_API_URL: '' }, { REACT_APP_API_URL: '   ' }])(
        'fails and names VITE_API_URL when it is missing (%j)',
        (env) => {
            const result = runEntrypoint(env);
            expect(result.status).not.toBe(0);
            expect(result.stderr).toMatch(/VITE_API_URL/);
            expect(result.envJs).toBeNull();
        },
    );

    it('writes env.js when the API URL is set', () => {
        const result = runEntrypoint({ VITE_API_URL: 'https://admin.example.org' });
        expect(result.stderr).not.toMatch(/VITE_API_URL/);
        expect(result.envJs).toContain('"API_URL": "https://admin.example.org"');
    });

    it('writes the add-on service origin when it is set', () => {
        const result = runEntrypoint({
            VITE_API_URL: 'https://admin.example.org',
            VITE_ADDON_SERVICE_ORIGIN: 'https://addons.example.org',
        });
        expect(result.envJs).toContain('"ADDON_SERVICE_ORIGIN": "https://addons.example.org"');
    });
});
