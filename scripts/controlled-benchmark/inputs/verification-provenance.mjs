import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const version = (name) => { try { return JSON.parse(readFileSync(path.join(process.cwd(), 'node_modules', name, 'package.json'), 'utf8')).version; } catch (error) { if (name === 'vite-plus' && error.code === 'ENOENT') return null; throw error; } };

// SCRATCH ONLY: an archive is not a Git checkout. Bind its actual root and all
// declared frozen bytes to an external invocation-supplied manifest seal.
export const sourceIdentity = (cwd, suppliedRevision) => {
    const root = realpathSync(cwd);
    const manifestPath = process.env.PREFLIGHT_SUBJECT_MANIFEST;
    const seal = process.env.PREFLIGHT_SUBJECT_MANIFEST_SHA256;
    if (!manifestPath || !seal || path.resolve(manifestPath) !== path.join(root, '.probe-source-manifest.json'))
        throw new Error('Archival provenance root/manifest binding mismatch');
    const manifestBytes = readFileSync(manifestPath);
    if (hash(manifestBytes) !== seal) throw new Error('Archival provenance manifest seal mismatch');
    const manifest = JSON.parse(manifestBytes);
    if (manifest.subjectRoot !== root || !/^[a-f0-9]{40}$/.test(manifest.origin?.baseRevision || ''))
        throw new Error('Archival provenance actual root/origin mismatch');
    if (suppliedRevision && suppliedRevision !== manifest.origin.baseRevision)
        throw new Error('Archival provenance supplied origin revision mismatch');
    if (realpathSync(path.join(root, 'node_modules')) !== manifest.sharedDependencyRoot)
        throw new Error('Archival provenance dependency root mismatch');
    const exclusions = ['node_modules', '.preflight-cache', '.probe-source-manifest.json'];
    const observed = [];
    const visit = (directory, prefix = '') => {
        for (const name of readdirSync(directory)) {
            const relative = prefix + name;
            if (!prefix && exclusions.includes(name)) continue;
            const absolute = path.join(directory, name);
            const stat = lstatSync(absolute);
            if (stat.isSymbolicLink()) throw new Error('Archival provenance source symlink rejected: ' + relative);
            if (stat.isDirectory()) visit(absolute, relative + '/');
            else if (stat.isFile()) observed.push(relative);
            else throw new Error('Archival provenance nonregular source rejected: ' + relative);
        }
    };
    visit(root);
    const declared = Object.keys(manifest.files).sort();
    if (JSON.stringify(observed.sort()) !== JSON.stringify(declared))
        throw new Error('Archival provenance declared file inventory mismatch');
    const digest = createHash('sha256');
    for (const file of declared) {
        if (path.isAbsolute(file) || file.split('/').includes('..')) throw new Error('Archival provenance invalid file path');
        const actual = hash(readFileSync(path.join(root, file)));
        if (actual !== manifest.files[file]) throw new Error('Archival provenance actual byte mismatch: ' + file);
        digest.update(file + '\0' + actual + '\0');
    }
    return {
        revision: null,
        revisionOrigin: 'archival-manifest-not-checkout-head',
        origin: manifest.origin,
        subjectRoot: root,
        manifest: { path: '.probe-source-manifest.json', sha256: seal },
        exclusions,
        dirty: null,
        snapshot: { algorithm: 'sha256', digest: digest.digest('hex'), files: declared.length },
    };
};

export const createRunProvenance = ({ runId, projects, inputs }) => ({
    schemaVersion: 1,
    runId,
    startedAt: new Date().toISOString(),
    source: sourceIdentity(process.cwd(), process.env.VERIFICATION_SOURCE_SHA),
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    toolchain: { vitePlus: version('vite-plus'), vitest: version('vitest'), storybook: version('storybook') },
    invocation: {
        command: [...process.argv],
        npmScript: process.env.npm_lifecycle_script,
        projects,
        inputs: inputs.map((file) => ({ path: path.relative(process.cwd(), file), sha256: hash(readFileSync(file)) })),
    },
});

export const suppliedBrowser = (meta) => {
    const userAgent = meta?.verificationA11y?.reports?.find((report) => report.result?.testEnvironment?.userAgent)
        ?.result.testEnvironment.userAgent;
    if (typeof userAgent !== 'string') return undefined;
    const chromium = /(?:HeadlessChrome|Chrome)\/([\d.]+)/.exec(userAgent);
    return { name: chromium ? 'chromium' : 'browser', ...(chromium && { version: chromium[1] }), userAgent };
};
