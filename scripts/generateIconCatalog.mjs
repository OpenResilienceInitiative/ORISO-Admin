/**
 * Icon catalog generator for the Admin Storybook page "Design System/Icons".
 *
 * Scans `src/resources/img/svg/**` for icon assets, cross-references each file
 * name against the app source (`src/**`, excluding tests, stories and the
 * IconCatalog component itself) and writes a deterministic, sorted catalog to
 * `src/components/IconCatalog/iconCatalog.generated.json`.
 *
 * The generated JSON is committed so Storybook builds without running this
 * script; output is deterministic, so diffs stay reviewable.
 *
 * Run:      npm run generate:icon-catalog
 * Auto-run: `npm run storybook` and `npm run build-storybook` regenerate it
 *           via the prestorybook / prebuild-storybook hooks.
 * Re-run manually (and commit the JSON diff) after adding, renaming or
 * removing icon assets, or after changing where icons are referenced in app
 * source.
 */
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const outputPath = path.join(repoRoot, 'src/components/IconCatalog/iconCatalog.generated.json');
const assetRoot = path.join(repoRoot, 'src/resources/img/svg');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.scss', '.sass', '.less', '.css']);
const assetExtensions = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp']);

const walk = (directory) => {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const absolutePath = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
    });
};

const toRepoPath = (absolutePath) => path.relative(repoRoot, absolutePath).split(path.sep).join('/');

const sourceContents = walk(path.join(repoRoot, 'src'))
    .filter((absolutePath) => {
        const repoPath = toRepoPath(absolutePath);
        return (
            sourceExtensions.has(path.extname(absolutePath)) &&
            !repoPath.includes('/IconCatalog/') &&
            !repoPath.match(/\.(stories|test|spec)\.[^.]+$/)
        );
    })
    .map((absolutePath) => ({ path: toRepoPath(absolutePath), content: fs.readFileSync(absolutePath, 'utf8') }));

const normalizeFamily = (fileName) =>
    path
        .basename(fileName, path.extname(fileName))
        .toLowerCase()
        .replace(/(?:^|[_\s-])(200|400|filled|active|inactive|hover|outline)(?=[_\s-]|$)/g, '_')
        .replace(/[_\s-](?:20|24|32|40|48)(?:px)?$/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

const getState = (fileName) => {
    const normalized = path.basename(fileName, path.extname(fileName)).toLowerCase();
    if (/(?:^|[_\s-])(filled|active)(?=[_\s-]|$)/.test(normalized)) return 'filled';
    if (/(?:^|[_\s-])400(?=[_\s-]|$)/.test(normalized)) return '400';
    if (/(?:^|[_\s-])200(?=[_\s-]|$)/.test(normalized)) return '200';
    if (/(?:^|[_\s-])hover(?=[_\s-]|$)/.test(normalized)) return 'hover';
    if (/(?:^|[_\s-])(outline|inactive)(?=[_\s-]|$)/.test(normalized)) return 'outline';
    return 'base';
};

const getRole = (state) => {
    if (state === 'filled') return 'selected';
    if (state === '200') return 'alternate-outline';
    if (state === 'hover') return 'hover';
    return 'default';
};

const getKind = (repoPath) => {
    if (repoPath.includes('/navbar/')) return 'sidebar-icon';
    if (repoPath.includes('/statistics-dashboard/')) return 'statistics-icon';
    if (repoPath.includes('/theme-preview/')) return 'preview-icon';
    if (repoPath.includes('/permissions/')) return 'permission-icon';
    return 'ui-icon';
};

const getSize = (fileName) => {
    const match = path.basename(fileName, path.extname(fileName)).match(/[_\s-](20|24|32|40|48)(?:px)?$/i);
    return match ? Number(match[1]) : null;
};

const entries = walk(assetRoot)
    .filter((absolutePath) => assetExtensions.has(path.extname(absolutePath).toLowerCase()))
    .map(toRepoPath)
    .sort((a, b) => a.localeCompare(b))
    .map((sourcePath) => {
        const fileName = path.basename(sourcePath);
        const kind = getKind(sourcePath);
        const assetScope = path
            .dirname(path.relative('src/resources/img/svg', sourcePath))
            .split(path.sep)
            .join('-')
            .replace(/^\.$/, '');
        const usageFiles = sourceContents
            .filter(({ content }) => content.includes(fileName))
            .map(({ path: sourcePath }) => sourcePath)
            .filter((sourcePath, index, values) => values.indexOf(sourcePath) === index)
            .sort((a, b) => a.localeCompare(b));
        const state = getState(fileName);

        return {
            id: `${kind}:${assetScope ? `${assetScope}:` : ''}${normalizeFamily(fileName)}:${state}`,
            family: normalizeFamily(fileName),
            state,
            role: getRole(state),
            kind,
            size: getSize(fileName),
            fileName,
            sourcePath,
            exportNames: [],
            usageFiles,
            usage: usageFiles.length > 0 ? 'app-used' : 'catalogued-only',
        };
    });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(entries, null, 2)}\n`);

const usedCount = entries.filter(({ usage }) => usage === 'app-used').length;
console.log(`Generated ${entries.length} icon catalog entries (${usedCount} app-used).`);
