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
        'http://localhost:3000',
        'http://localhost/api',
        'http://localhost?x=1',
        'http://localhost#preview',
        'https://localhost:8443/auth',
        // Host names are case-insensitive.
        'https://APP.ORISO.ORG',
        'https://Admin.Oriso-Dev.Site/admin',
        'HTTP://LOCALHOST:3000',
        'http://LocalHost/api',
    ])('fails the build when the bundle contains %s', (host) => {
        const result = runGuardOn(`const u = "${host}";`);
        expect(result.status, result.stderr).toBe(1);
        expect(result.stderr).toContain('Hardcoded deployment value');
    });

    it('still fails when a forbidden localhost URL shares the line with an approved literal', () => {
        const otelMixed = 'const u=`http://localhost:4318/`+t;const bad="http://localhost:3000/service";';
        const routerMixed =
            'let r=`http://localhost`;e&&(r=e.location.origin);const bad="http://localhost:9000/admin";';
        expect(runGuardOn(otelMixed).status, 'otel line').toBe(1);
        expect(runGuardOn(routerMixed, 'vendor-ui-test.js').status, 'router line').toBe(1);
    });

    it('allows the two third-party defaults found in the real bundle', () => {
        const otel = 'function Y(e,t){return{headers:async()=>e,url:`http://localhost:4318/`+t}}';
        const router = 'let r=`http://localhost`;e&&(r=e.location.origin===`null`?e.location.href:e.location.origin)';
        expect(runGuardOn(otel).status, otel).toBe(0);
        expect(runGuardOn(router, 'vendor-ui-test.js').status, router).toBe(0);
        // The exception follows the code, not the chunk name.
        expect(runGuardOn(router).status, router).toBe(0);
    });

    it('allows the defaults only in their own code, not the bare literals elsewhere', () => {
        // Same literals, but not the OTLP exporter's `url:` default nor react-router's parse base.
        const otelElsewhere = 'const metrics=`http://localhost:4318/`;fetch(metrics);';
        const routerElsewhere = 'const api=`http://localhost`;fetch(api+`/service`);';
        expect(runGuardOn(otelElsewhere).status, 'otel literal in a regular chunk').toBe(1);
        expect(runGuardOn(routerElsewhere, 'vendor-other-test.js').status, 'bare localhost in a vendor chunk').toBe(1);
        expect(runGuardOn(routerElsewhere).status, 'bare localhost in a regular chunk').toBe(1);
    });

    it('does not flag names that merely start with localhost', () => {
        const result = runGuardOn('const u = "http://localhost.example.org";');
        expect(result.status, result.stderr).toBe(0);
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
