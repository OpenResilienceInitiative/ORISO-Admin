import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Keep only repository-relative test paths and test execution windows from Vitest's JSON. */
export const fileTimings = (report, root) =>
    report.testResults.map(({ name, startTime, endTime }) => {
        const file = path.relative(root, name).split(path.sep).join('/');
        if (
            file.startsWith('../') ||
            path.isAbsolute(file) ||
            !/^(src|scripts)\/.*\.(test|spec)\.[cm]?[jt]sx?$/.test(file)
        ) {
            throw new Error('Vitest report includes a test outside the expected repository paths');
        }
        if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
            throw new Error('Vitest report includes invalid file timing');
        }
        return { file, testExecutionWindowMs: Math.round(endTime - startTime) };
    });

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [, , input, output] = process.argv;
    const report = JSON.parse(await readFile(input, 'utf8'));
    await writeFile(output, `${JSON.stringify({ files: fileTimings(report, process.cwd()) }, null, 2)}\n`);
}
