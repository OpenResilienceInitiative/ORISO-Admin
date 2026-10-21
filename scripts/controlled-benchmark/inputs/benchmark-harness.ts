// Scratch only. Identical source on both toolchain subjects; no renderer/play changes.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { BaseSequencer } from 'vitest/node';

const selected = [
    'Text',
    'Outlined',
    'Filled',
    'Tonal',
    'Disabled',
    'DisabledText',
    'DisabledOutlined',
    'DisabledTonal',
    'AllVariantsDisabled',
    'AllVariants',
];
const selectedFile = 'src/components/M3Button/M3Button.stories.tsx';
const root = fs.realpathSync(process.cwd());
const deps = fs.realpathSync(path.join(root, 'node_modules'));
const output = process.env.BENCHMARK_OUTPUT;
// Rejection markers are written only on failure. Publishing a complete temp
// file with linkSync is atomic and refuses to replace the first fatal.json.
function failGuard(
    reason: string,
    project = process.env.BENCHMARK_PROJECT || 'configuration',
    instanceId = 'shared',
    details: any = {},
): never {
    if (!output) throw new Error(reason);
    const safeProject = ['unit', 'storybook'].includes(project) ? project : 'configuration';
    const failure = {
        schemaVersion: 1,
        kind: 'benchmark-guard-fatal',
        reason,
        command: {
            attempt: process.env.BENCHMARK_ATTEMPT,
            variant: process.env.BENCHMARK_VARIANT,
            project: process.env.BENCHMARK_PROJECT,
            output: path.resolve(output),
            sourceManifest: process.env.PREFLIGHT_SUBJECT_MANIFEST,
            sourceManifestSHA256: process.env.PREFLIGHT_SUBJECT_MANIFEST_SHA256,
        },
        observed: {
            project,
            instanceId,
            pid: process.pid,
            cwd: process.cwd(),
            root,
            dependencyRoot: deps,
            requestedCache: process.env.BENCHMARK_CACHE,
        },
        details,
    };
    fs.appendFileSync(
        path.join(output, `resolution-${process.pid}-${safeProject}-${instanceId}.jsonl`),
        JSON.stringify({ project, instanceId, phase: 'fatal-guard', accepted: false, ...failure }) + '\n',
    );
    const temporary = path.join(output, `.fatal-${process.pid}-${randomUUID()}.tmp`);
    try {
        fs.writeFileSync(temporary, JSON.stringify(failure) + '\n', { flag: 'wx' });
        try {
            fs.linkSync(temporary, path.join(output, 'fatal.json'));
        } catch (error: any) {
            if (error.code !== 'EEXIST') throw error;
        }
    } finally {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
    throw new Error(reason);
}
if (
    !output ||
    !process.env.BENCHMARK_CACHE ||
    !['original', 'candidate'].includes(process.env.BENCHMARK_VARIANT || '') ||
    !['unit', 'storybook'].includes(process.env.BENCHMARK_PROJECT || '') ||
    !process.env.BENCHMARK_ATTEMPT ||
    !process.env.PREFLIGHT_SUBJECT_MANIFEST ||
    !/^[a-f0-9]{64}$/.test(process.env.PREFLIGHT_SUBJECT_MANIFEST_SHA256 || '')
) {
    failGuard('Explicit benchmark command/source/output/cache identity required');
}
class BenchmarkSequencer extends BaseSequencer {
    async sort(specs: any[]) {
        if (specs.some((s) => typeof s.moduleId !== 'string')) failGuard('Unknown test specification identity');
        return [...specs].sort((a, b) =>
            path.relative(root, a.moduleId).localeCompare(path.relative(root, b.moduleId), 'en'),
        );
    }
}
const clean = (id: string) => decodeURIComponent(id.split(/[?#]/)[0].replace(/^\/@fs\//, '/'));
const inside = (p: string, base: string) => p === base || p.startsWith(base + path.sep);
const requestedCache = path.resolve(process.env.BENCHMARK_CACHE!);
if (!inside(requestedCache, path.join(root, '.preflight-cache')))
    failGuard('Requested cache is outside this subject', undefined, undefined, { requestedCache });
const nativeCachePath = (project: string) => path.join(requestedCache, 'native', project);
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const ownVitestVersion = JSON.parse(fs.readFileSync(path.join(deps, 'vitest', 'package.json'), 'utf8')).version;
if (ownVitestVersion !== (process.env.BENCHMARK_VARIANT === 'original' ? '4.1.9' : '5.0.5'))
    failGuard('Unreviewed native cache API version');
const nativeV5 = ownVitestVersion === '5.0.5';
// Source-only identity: no output path, attempt, cache temperature or command ID.
const sourceManifestBytes = fs.readFileSync(process.env.PREFLIGHT_SUBJECT_MANIFEST!);
if (sha256(sourceManifestBytes) !== process.env.PREFLIGHT_SUBJECT_MANIFEST_SHA256)
    failGuard('Cache observer source seal mismatch');
const sourceManifest = JSON.parse(sourceManifestBytes.toString('utf8'));
const sourceContractDigest = sha256(
    JSON.stringify(Object.entries(sourceManifest.files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
);
export function assertNativeCachePath(value: unknown, expected: string, project: string, instanceId: string) {
    if (
        typeof value !== 'string' ||
        !path.isAbsolute(value) ||
        path.resolve(value) !== expected ||
        !inside(value, requestedCache)
    )
        failGuard('Native module cache path/binding mismatch', project, instanceId, {
            value,
            expected,
            requestedCache,
        });
    let ancestor = value as string;
    while (!fs.existsSync(ancestor)) {
        const parent = path.dirname(ancestor);
        if (parent === ancestor) failGuard('Native cache has no owned existing ancestor', project, instanceId);
        ancestor = parent;
    }
    if (!inside(fs.realpathSync(ancestor), fs.realpathSync(requestedCache)))
        failGuard('Native module cache realpath escape', project, instanceId, {
            value,
            ancestor,
            real: fs.realpathSync(ancestor),
        });
}
function nativeConfiguration(config: any) {
    return {
        enabled: nativeV5 ? config.fsModuleCache === true : config.experimental?.fsModuleCache === true,
        flag: nativeV5 ? config.fsModuleCache ?? null : config.experimental?.fsModuleCache ?? null,
        path: nativeV5 ? config.fsModuleCachePath : config.experimental?.fsModuleCachePath,
    };
}
function setNativeCachePath(config: any, name: string) {
    // Set the supported location only. Never enable v4 or disable v5 caching.
    if (nativeV5) config.fsModuleCachePath = nativeCachePath(name);
    else config.experimental = { ...config.experimental, fsModuleCachePath: nativeCachePath(name) };
}
export function sourceGuard(project: string) {
    const instanceId = randomUUID();
    const trace = path.join(output!, `resolution-${process.pid}-${project}-${instanceId}.jsonl`);
    const emit = (event: any) => fs.appendFileSync(trace, JSON.stringify({ project, instanceId, ...event }) + '\n');
    const inspect = (id: string, phase: string) => {
        const p = clean(id);
        if (!path.isAbsolute(p) || !fs.existsSync(p)) return;
        const real = fs.realpathSync(p);
        const accepted = inside(real, root) || inside(real, deps);
        emit({ phase, id, real, accepted });
        if (!accepted)
            failGuard(`Benchmark cross-root source escape: ${real}`, project, instanceId, { phase, id, real });
    };
    const pluginName = `benchmark-source-guard-${project}`;
    return {
        name: pluginName,
        enforce: 'pre',
        // Observe only. Do not delegate recursively or replace Vite's resolution.
        resolveId(id: string, importer: string | undefined) {
            inspect(id, 'resolve-observation');
            if (importer) inspect(importer, 'importer-observation');
            return null;
        },
        load(id: string) {
            inspect(id, 'load');
            return null;
        },
        configureServer(server: any) {
            server.middlewares.use((req: any, _res: any, next: any) => {
                const requestUrl = req.url || '/';
                const requestPath = requestUrl.split(/[?#]/)[0];
                const url = clean(requestUrl);
                // HTTP root-relative paths are not OS filesystem identities.
                // Keep explicit Vite /@fs/ and resolved-ID/load guards strict.
                if (requestPath.startsWith('/@fs/')) {
                    emit({ phase: 'http-request', namespace: 'explicit-fs', requestUrl, mappedPath: url });
                    inspect(url, 'http');
                } else {
                    const candidates = [path.join(root, url), path.join(root, 'public', url)].filter((candidate) =>
                        fs.existsSync(candidate),
                    );
                    const absoluteObservation = !candidates.length && path.isAbsolute(url) && fs.existsSync(url);
                    emit({
                        phase: 'http-request',
                        namespace: candidates.length
                            ? 'root-relative'
                            : absoluteObservation
                            ? 'absolute-observation'
                            : 'unmapped-or-virtual',
                        requestUrl,
                        requestPath,
                        candidates,
                    });
                    if (candidates.length) for (const candidate of candidates) inspect(candidate, 'http');
                    else if (absoluteObservation) inspect(url, 'http');
                }
                next();
            });
        },
        configureVitest(context: any) {
            const global = nativeConfiguration(context.vitest.config);
            const actual = nativeConfiguration(context.project.config);
            const contract = {
                schema: 'oriso-supported-native-cache-source-v1',
                sourceContractDigest,
                guardSHA256: sourceManifest.files['benchmark-harness.ts'],
                lockSHA256: sourceManifest.files['package-lock.json'],
                variant: process.env.BENCHMARK_VARIANT,
                vitest: ownVitestVersion,
                node: process.version,
                project,
                rootMode: context.vitest.viteConfig?.mode ?? context.vitest.vite?.config?.mode ?? null,
                projectMode: context.project.vite.config.mode ?? null,
                rootEnabled: global.enabled,
                projectEnabled: actual.enabled,
            };
            const contractDigest = sha256(JSON.stringify(contract));
            emit({
                phase: 'native-cache-config',
                global,
                actual,
                contract,
                contractDigest,
                projectName: context.project.config.name,
                root: context.project.vite.config.root,
                sourceManifestSHA256: process.env.PREFLIGHT_SUBJECT_MANIFEST_SHA256,
            });
            assertNativeCachePath(global.path, nativeCachePath('root'), project, instanceId);
            assertNativeCachePath(actual.path, nativeCachePath(project), project, instanceId);
            // Vitest expands the one declared Chromium instance into this exact native name.
            const expectedProjectName = project === 'storybook' ? 'storybook (chromium)' : project;
            if (
                global.enabled !== nativeV5 ||
                actual.enabled !== nativeV5 ||
                context.project.config.name !== expectedProjectName ||
                context.project.vite.config.root !== root
            )
                failGuard('Native cache enablement/project identity changed', project, instanceId, { global, actual });
            if (!nativeV5) return; // Original's disabled experimental feature remains disabled.
            if (typeof context.defineCacheKeyGenerator !== 'function')
                failGuard('Supported native source-byte API unavailable', project, instanceId);
            context.defineCacheKeyGenerator(({ environment, id, sourceCode }: any) => {
                inspect(id, 'cache-source-path');
                const file = clean(id);
                if (!path.isAbsolute(file) || !fs.existsSync(file)) return contractDigest;
                const real = fs.realpathSync(file);
                if (inside(real, deps) || inside(real, requestedCache)) return contractDigest;
                const relative = path.relative(root, real).split(path.sep).join('/');
                const expected = sourceManifest.files[relative];
                const actualSHA256 = typeof sourceCode === 'string' ? sha256(sourceCode) : null;
                emit({
                    phase: 'cache-source',
                    id,
                    real,
                    relative,
                    sourceSHA256: actualSHA256,
                    expectedSHA256: expected,
                    environment: environment?.name,
                    contractDigest,
                    sourceManifestSHA256: process.env.PREFLIGHT_SUBJECT_MANIFEST_SHA256,
                    run: {
                        attempt: process.env.BENCHMARK_ATTEMPT,
                        variant: process.env.BENCHMARK_VARIANT,
                        output,
                        project,
                        pid: process.pid,
                    },
                });
                if (
                    !expected ||
                    actualSHA256 !== expected ||
                    typeof environment?.name !== 'string' ||
                    environment.config.root !== root
                )
                    failGuard('Native source-byte witness mismatch', project, instanceId, {
                        id,
                        real,
                        expectedSHA256: expected,
                        sourceSHA256: actualSHA256,
                    });
                return contractDigest; // Stable option binding; never return false or invalidate warm reuse.
            });
        },
        configResolved(effective: any) {
            const guardInstances = effective.plugins.filter((p: any) => p.name === pluginName).length;
            // Record final actual values even when the strict boundary rejects them.
            // CACHE_DIR is supplied before addon imports; retain the addon's own
            // cache version/project suffix instead of mutating root/publicDir here.
            emit({
                phase: 'effective-config',
                root: effective.root,
                publicDir: effective.publicDir,
                cacheDir: effective.cacheDir,
                dependencyRoot: deps,
                effectiveProject: effective.test?.name,
                pluginName,
                guardInstances,
                mode: effective.mode,
                nativeCacheRequested: nativeConfiguration(effective.test ?? {}),
                requested: { root, cacheDir: requestedCache, CACHE_DIR: process.env.CACHE_DIR },
                run: {
                    variant: process.env.BENCHMARK_VARIANT,
                    attempt: process.env.BENCHMARK_ATTEMPT,
                    pid: process.pid,
                    cwd: process.cwd(),
                    output,
                    sourceManifest: process.env.PREFLIGHT_SUBJECT_MANIFEST,
                    sourceManifestSHA256: process.env.PREFLIGHT_SUBJECT_MANIFEST_SHA256,
                },
            });
            if (
                effective.root !== root ||
                typeof effective.cacheDir !== 'string' ||
                !inside(effective.cacheDir, requestedCache)
            )
                failGuard('Benchmark root/cache isolation failed', project, instanceId, {
                    effectiveRoot: effective.root,
                    effectivePublicDir: effective.publicDir,
                    effectiveCacheDir: effective.cacheDir,
                    requestedCache,
                });
            if (process.env.CACHE_DIR !== requestedCache)
                failGuard('Storybook CACHE_DIR does not match requested attempt cache', project, instanceId, {
                    CACHE_DIR: process.env.CACHE_DIR,
                    requestedCache,
                });
            if (guardInstances !== 1)
                failGuard('Duplicate/absent benchmark project guard', project, instanceId, { guardInstances });
        },
    };
}
function exactStoryRegistration() {
    return {
        name: 'benchmark-exact-registration',
        enforce: 'post',
        transform(code: string, id: string) {
            if (path.relative(root, clean(id)) !== selectedFile || !code.includes('_isRunningFromThisFile')) return;
            const blocks = [...code.matchAll(/  _test\([\s\S]*?\n  \}\)\);/g)].map((m) => ({
                code: m[0],
                exportName: /exportName: "([^"]+)"/.exec(m[0])?.[1],
                storyId: /storyId: "([^"]+)"/.exec(m[0])?.[1],
            }));
            if (blocks.length !== 12) failGuard('Original12story registration inventory changed');
            const kept = selected.map((name) => {
                const matches = blocks.filter((b) => b.exportName === name);
                if (matches.length !== 1) failGuard('Exact export absent/duplicate: ' + name);
                return matches[0];
            });
            const excluded = blocks.filter((b) => !selected.includes(b.exportName!));
            if (
                JSON.stringify(excluded.map((b) => b.exportName).sort()) !==
                JSON.stringify(['AlignmentVsLegacy', 'Loading'])
            )
                failGuard('Unexpected sample exclusion');
            fs.writeFileSync(
                path.join(output!, `selection-${process.pid}.json`),
                JSON.stringify(
                    {
                        project: 'storybook',
                        file: selectedFile,
                        kept: kept.map(({ exportName, storyId }) => ({ exportName, storyId })),
                        excluded: excluded.map(({ exportName, storyId }) => ({ exportName, storyId })),
                    },
                    null,
                    2,
                ),
            );
            const start = code.indexOf(blocks[0].code);
            const last = blocks[blocks.length - 1];
            return {
                code:
                    code.slice(0, start) +
                    kept.map((b) => b.code).join('\n') +
                    code.slice(code.indexOf(last.code) + last.code.length),
                map: null,
            };
        },
    };
}

export function applyBenchmark(config: any) {
    config.root = root;
    config.publicDir = path.join(root, 'public');
    config.cacheDir = process.env.BENCHMARK_CACHE;
    setNativeCachePath(config.test, 'root');
    config.server = { ...config.server, fs: { strict: true, allow: [root, deps] } };
    // Keep root React/SVGR plugins and extends behavior untouched. Instrument
    // each actual inline project instead of relying on global-plugin inheritance.
    Object.assign(config.test, {
        maxWorkers: 1,
        pool: 'forks',
        fileParallelism: false,
        retry: 0,
        clearMocks: false,
        coverage: { ...config.test.coverage, enabled: false },
        sequence: { sequencer: BenchmarkSequencer, concurrent: false, shuffle: false },
    });
    if (process.env.BENCHMARK_VARIANT === 'original') delete config.test.sharedViteServer;
    for (const project of config.test.projects) {
        const name = project.test.name;
        if (!['unit', 'storybook'].includes(name)) failGuard('Unexpected benchmark project');
        if ((project.plugins ?? []).some((p: any) => String(p?.name).startsWith('benchmark-')))
            failGuard('Benchmark instrumentation already attached');
        Object.assign(project, {
            root,
            publicDir: path.join(root, 'public'),
            cacheDir: process.env.BENCHMARK_CACHE,
            server: { ...project.server, fs: { strict: true, allow: [root, deps] } },
        });
        setNativeCachePath(project.test, name);
        project.plugins = [
            ...(project.plugins ?? []),
            sourceGuard(name),
            ...(name === 'storybook' ? [exactStoryRegistration()] : []),
        ];
        Object.assign(project.test, {
            maxWorkers: 1,
            fileParallelism: false,
            retry: 0,
            sequence: { sequencer: BenchmarkSequencer, concurrent: false, shuffle: false },
        });
        if (project.test.name !== 'storybook') continue;
        project.test.browser.viewport = { width: 1200, height: 900 };
        project.test.browser.headless = true;
        project.test.browser.instances = [{ browser: 'chromium' }];
        if (process.env.BENCHMARK_VARIANT === 'original') delete project.test.browser.locators;
    }
    // The retained provider already pins de-DE and Europe/Berlin; browser default DPR is1.
    // Effective audit metadata must independently verify those contexts before timing.
    return config;
}
