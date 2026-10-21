/** Native Vite guard controls only; never a benchmark or product acceptance run. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [caseName] = process.argv.slice(2);
const root = fs.realpathSync(process.cwd());
const output = process.env.BENCHMARK_OUTPUT;
const cache = process.env.BENCHMARK_CACHE;
const project = process.env.BENCHMARK_PROJECT;
assert(output && cache && project && caseName);
const manifest = JSON.parse(fs.readFileSync(process.env.PREFLIGHT_SUBJECT_MANIFEST, 'utf8'));
const deps = fs.realpathSync(path.join(root, 'node_modules'));
const ownRequire = createRequire(path.join(root, 'package.json'));
const vite = await import(pathToFileURL(ownRequire.resolve('vite')).href);
const outside = path.join(output, 'outside.mjs');
fs.writeFileSync(outside, 'export const outsideControl = true;\n', { flag: 'wx' });
fs.mkdirSync(cache, { recursive: true });
let bootstrap;
let server;
let guard;
let intentionallyAlive;
const write = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n');
const isNegative = !['http-root', 'http-source', 'http-public', 'http-own-package', 'virtual-module'].includes(
    caseName,
);
const fsUrl = (file) => '/@fs/' + file;
try {
    // Load the actual sealed TS helper with this leg's own native Vite loader.
    // This bootstrap server has no guard/plugin under test and never listens.
    bootstrap = await vite.createServer({
        root,
        configFile: false,
        envDir: false,
        appType: 'custom',
        cacheDir: path.join(cache, 'bootstrap'),
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true, watch: null },
    });
    const helper = await bootstrap.ssrLoadModule(path.join(root, 'benchmark-harness.ts'));
    await bootstrap.close();
    bootstrap = undefined;
    guard = helper.sourceGuard(project);
    const virtualPlugin = {
        name: 'native-control-virtual-module',
        resolveId(id) {
            if (id === '\0benchmark-control' || id === 'virtual:benchmark-control') return '\0benchmark-control';
            if (id === 'virtual:benchmark-outside') return outside;
        },
        load(id) {
            if (id === '\0benchmark-control') return 'export const virtualControl = true;';
        },
    };
    const config = {
        root,
        configFile: false,
        envDir: false,
        publicDir: path.join(root, 'public'),
        appType: 'custom',
        cacheDir: cache,
        optimizeDeps: { noDiscovery: true, include: [] },
        plugins: [guard, virtualPlugin],
        test: { name: project },
        server: {
            host: '127.0.0.1',
            port: 0,
            strictPort: true,
            watch: null,
            fs: { strict: true, allow: [root, deps] },
        },
    };
    if (caseName === 'config-root-isolation') config.root = output;
    if (caseName === 'cache-isolation') config.cacheDir = path.join(output, 'wrong-cache');
    if (caseName === 'cache-env-isolation') process.env.CACHE_DIR = path.join(output, 'wrong-cache-env');
    if (caseName === 'duplicate-guard') config.plugins.unshift(guard);
    let observedError;
    try {
        server = await vite.createServer(config);
        await server.listen();
        const address = server.httpServer.address();
        assert(address && typeof address !== 'string');
        const origin = `http://127.0.0.1:${address.port}`;
        const request = async (url) => {
            const response = await fetch(origin + url);
            const body = await response.text(); // consume owned HTTP response before shutdown
            write('http-response.json', { url, status: response.status, bytes: body.length });
            return { status: response.status, body };
        };
        if (caseName.startsWith('native-')) {
            // Exercise the real sealed hook/callback through this own native
            // Vite loader with an explicit supported-context fixture. This is
            // a rejection control, not actual Vitest config/execution proof.
            const v5 = JSON.parse(fs.readFileSync(path.join(deps, 'vitest/package.json'), 'utf8')).version === '5.0.5';
            const options = (name) =>
                v5
                    ? { fsModuleCache: true, fsModuleCachePath: path.join(cache, 'native', name) }
                    : { experimental: { fsModuleCachePath: path.join(cache, 'native', name) } };
            const global = options('root');
            const actual = { ...options(project), name: project };
            if (caseName === 'native-cache-root-escape') {
                if (v5) global.fsModuleCachePath = output;
                else global.experimental.fsModuleCachePath = output;
            } else if (caseName === 'native-cache-project-symlink') {
                fs.mkdirSync(path.join(cache, 'native'), { recursive: true });
                fs.symlinkSync(output, path.join(cache, 'native', project), 'dir');
            } else if (caseName === 'native-cache-path-missing') {
                if (v5) delete actual.fsModuleCachePath;
                else delete actual.experimental.fsModuleCachePath;
            }
            write('native-context-fixture.json', {
                fixtureNotActualVitestResolution: true,
                global,
                actual,
                project,
                v5,
            });
            let generator;
            guard.configureVitest({
                vitest: { config: global, viteConfig: { mode: 'test' } },
                project: { config: actual, vite: { config: { root, mode: 'test' } } },
                defineCacheKeyGenerator(callback) {
                    assert.equal(generator, undefined);
                    generator = callback;
                },
            });
            if (caseName === 'native-source-changed') {
                assert(v5 && typeof generator === 'function');
                const file = path.join(root, 'src/config/runtimeConfig.test.ts');
                generator({
                    id: file,
                    environment: { name: 'ssr', config: { root } },
                    sourceCode: fs.readFileSync(file, 'utf8') + '\n// CONTROL changed source bytes\n',
                });
            }
        } else if (caseName === 'http-root') {
            const r = await request('/?sessionId=synthetic-guard-control');
            assert(r.status < 500); // route may be404: no browser tester is installed in this control
        } else if (caseName === 'http-source') {
            assert(manifest.files['src/config/runtimeConfig.ts']);
            const r = await request('/src/config/runtimeConfig.ts?import');
            assert.equal(r.status, 200);
        } else if (caseName === 'http-public') {
            const file = Object.keys(manifest.files)
                .filter((f) => f.startsWith('public/'))
                .sort()[0];
            assert(file, 'sealed public resource required');
            const r = await request(encodeURI('/' + file.slice('public/'.length)));
            assert.equal(r.status, 200);
        } else if (caseName === 'http-own-package') {
            const file = ownRequire.resolve('vite/dist/client/env.mjs');
            assert(fs.realpathSync(file).startsWith(deps + path.sep));
            const r = await request(fsUrl(file));
            assert.equal(r.status, 200);
        } else if (caseName === 'virtual-module') {
            assert.equal(guard.resolveId('virtual:benchmark-control', undefined), null);
            const r = await request('/@id/__x00__benchmark-control');
            assert.equal(r.status, 200);
            assert(r.body.includes('virtualControl'));
        } else if (caseName === 'module-root') {
            guard.load('/');
        } else if (caseName === 'module-outside') {
            guard.load(outside);
        } else if (caseName === 'http-fs-outside') {
            await request(fsUrl(outside));
        } else if (caseName === 'http-fs-encoded-outside') {
            await request('/@fs/' + encodeURIComponent(outside));
        } else if (caseName === 'http-fs-root') {
            await request('/@fs/');
        } else if (caseName === 'http-absolute-outside') {
            await request(outside);
        } else if (caseName === 'http-symlink-outside') {
            const link = path.join(cache, 'outside-link.mjs');
            fs.symlinkSync(outside, link);
            await request('/' + path.relative(root, link).split(path.sep).join('/'));
        } else if (caseName === 'module-cross-dependency') {
            assert(process.env.CONTROL_OTHER_DEPENDENCY_ROOT);
            const otherRequire = createRequire(
                path.join(path.dirname(process.env.CONTROL_OTHER_DEPENDENCY_ROOT), 'package.json'),
            );
            guard.load(otherRequire.resolve('vite/dist/client/env.mjs'));
        } else if (caseName === 'virtual-outside') {
            await request('/@id/virtual:benchmark-outside');
        } else if (caseName === 'foreign-marker') {
            const payload = {
                schemaVersion: 1,
                kind: 'benchmark-guard-fatal',
                reason: 'SYNTHETIC foreign binding controller control',
                command: {
                    attempt: process.env.BENCHMARK_ATTEMPT + '-foreign',
                    variant: process.env.BENCHMARK_VARIANT,
                    project,
                    output,
                    sourceManifest: process.env.PREFLIGHT_SUBJECT_MANIFEST,
                    sourceManifestSHA256: process.env.PREFLIGHT_SUBJECT_MANIFEST_SHA256,
                },
                observed: {
                    project,
                    instanceId: 'synthetic-foreign',
                    pid: process.pid,
                    cwd: root,
                    root,
                    dependencyRoot: deps,
                    requestedCache: cache,
                },
                details: { syntheticControllerControl: true },
            };
            const temp = path.join(output, 'foreign-marker.tmp');
            fs.writeFileSync(temp, JSON.stringify(payload), { flag: 'wx' });
            fs.linkSync(temp, path.join(output, 'fatal.json'));
            fs.unlinkSync(temp);
        } else if (
            !['config-root-isolation', 'cache-isolation', 'cache-env-isolation', 'duplicate-guard'].includes(caseName)
        ) {
            throw new Error('Unknown control case: ' + caseName);
        }
    } catch (error) {
        observedError = String(error?.stack || error);
        if (!isNegative) throw error;
    }
    if (isNegative) {
        const fatal = path.join(output, 'fatal.json');
        assert(fs.existsSync(fatal), 'actual rejection must publish complete fatal marker');
        const first = fs.readFileSync(fatal, 'utf8');
        const payload = JSON.parse(first);
        // A second real rejection must preserve the first complete marker bytes.
        try {
            guard.load('/');
        } catch {}
        assert.equal(fs.readFileSync(fatal, 'utf8'), first);
        assert(!fs.readdirSync(output).some((f) => f.startsWith('.fatal-') && f.endsWith('.tmp')));
        write('first-fatal-proof.json', {
            caseName,
            payload,
            observedError,
            firstMarkerPreserved: true,
            temporaryPublicationFilesRemaining: 0,
            heldAliveForControllerTermination: true,
        });
        // Deliberately reproduce a fatal request with a still-live native server.
        // Only the shared controller monitor may terminate this owned child.
        intentionallyAlive = setInterval(() => {}, 1000);
        await new Promise(() => {});
    }
    const events = fs
        .readdirSync(output)
        .filter((f) => /^resolution-.*\.jsonl$/.test(f))
        .flatMap((f) =>
            fs
                .readFileSync(path.join(output, f), 'utf8')
                .trim()
                .split('\n')
                .filter(Boolean)
                .map((line) => JSON.parse(line)),
        );
    assert(!events.some((e) => e.accepted === false));
    assert(events.some((e) => e.phase === 'effective-config' && e.project === project));
    write('control-result.json', {
        caseName,
        status: 'native-positive-passed',
        events: events.length,
        noRejectedEvents: true,
        noFatalMarker: !fs.existsSync(path.join(output, 'fatal.json')),
    });
} finally {
    if (intentionallyAlive) clearInterval(intentionallyAlive);
    await server?.close();
    await bootstrap?.close();
}
