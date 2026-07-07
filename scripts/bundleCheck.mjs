#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const buildDir = join(process.cwd(), 'build');
const assetsDir = join(buildDir, 'assets');

const MAIN_CHUNK_GZIP_LIMIT_KB = Number(process.env.BUNDLE_MAIN_GZIP_LIMIT_KB || 400);
const MIN_LAZY_CHUNKS = Number(process.env.BUNDLE_MIN_LAZY_CHUNKS || 10);

const gzipSize = (filePath) => gzipSync(readFileSync(filePath)).length;

const listJsAssets = () =>
    readdirSync(assetsDir)
        .filter((file) => file.endsWith('.js'))
        .map((file) => join(assetsDir, file));

const readManifest = () => {
    const candidates = [join(buildDir, '.vite', 'manifest.json'), join(buildDir, 'manifest.json')];
    const manifestPath = candidates.find((path) => statSync(path, { throwIfNoEntry: false }));

    if (!manifestPath) {
        throw new Error('Missing Vite manifest. Run "yarn build" first.');
    }

    return JSON.parse(readFileSync(manifestPath, 'utf8'));
};

const findEntryChunk = (manifest) => {
    const entry = Object.values(manifest).find((item) => item.isEntry);
    if (!entry?.file) {
        throw new Error('Could not find entry chunk in build manifest.');
    }
    return join(buildDir, entry.file);
};

const findUsersChunk = (manifest) =>
    Object.values(manifest).find(
        (item) => typeof item.src === 'string' && item.src.includes('pages/users/List') && item.file.endsWith('.js'),
    );

const run = async () => {
    const manifest = readManifest();
    const entryChunkPath = findEntryChunk(manifest);
    const entryGzipKb = gzipSize(entryChunkPath) / 1024;

    console.log(`Entry chunk: ${entryChunkPath}`);
    console.log(`Entry gzip size: ${entryGzipKb.toFixed(1)} KB (limit ${MAIN_CHUNK_GZIP_LIMIT_KB} KB)`);

    if (entryGzipKb > MAIN_CHUNK_GZIP_LIMIT_KB) {
        throw new Error(
            `Main entry chunk exceeds gzip budget (${entryGzipKb.toFixed(1)} KB > ${MAIN_CHUNK_GZIP_LIMIT_KB} KB).`,
        );
    }

    const usersChunk = findUsersChunk(manifest);
    if (!usersChunk) {
        throw new Error('Users page is not emitted as a separate lazy chunk.');
    }

    const entryFileName = entryChunkPath.split(/[\\/]/).pop();
    const usersFileName = join(buildDir, usersChunk.file).split(/[\\/]/).pop();
    if (entryFileName === usersFileName) {
        throw new Error('Users page chunk must not be bundled into the main entry chunk.');
    }

    console.log(`Users lazy chunk: ${usersChunk.file}`);

    const lazyChunks = Object.values(manifest).filter(
        (item) => typeof item.src === 'string' && item.src.includes('/pages/') && item.file.endsWith('.js'),
    );

    console.log(`Lazy page chunks: ${lazyChunks.length}`);

    if (lazyChunks.length < MIN_LAZY_CHUNKS) {
        throw new Error(`Expected at least ${MIN_LAZY_CHUNKS} lazy page chunks, found ${lazyChunks.length}.`);
    }

    const jsAssets = listJsAssets();
    console.log(`Total JS assets: ${jsAssets.length}`);
    console.log('Bundle check passed.');
};

run().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
