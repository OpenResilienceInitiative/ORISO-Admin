import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';

const linter = new Linter();
const ruleName = 'count-legacy-antd-buttons';
const antBarrels = new Set(['antd', 'antd/es', 'antd/lib']);
const buttonSubpath = /^antd\/(?:es|lib)\/button(?:\/|$)/;

linter.defineParser('typescript', parser);
linter.defineRule(ruleName, {
    create(context) {
        const report = (node) => context.report({ node, message: 'Ant Design Button usage' });
        return {
            ImportDeclaration(node) {
                if (node.importKind === 'type') return;
                const module = node.source.value;
                if (buttonSubpath.test(module) && node.specifiers.length === 0) report(node);
                for (const specifier of node.specifiers) {
                    if (specifier.importKind === 'type') continue;
                    const importsButton =
                        buttonSubpath.test(module) ||
                        (antBarrels.has(module) &&
                            (specifier.imported?.name === 'Button' || specifier.type === 'ImportNamespaceSpecifier'));
                    if (!importsButton) continue;
                    report(specifier);
                    for (const variable of context.getDeclaredVariables(specifier)) {
                        for (const reference of variable.references) {
                            if (reference.isValueReference) report(reference.identifier);
                        }
                    }
                }
            },
            ExportNamedDeclaration(node) {
                if (node.exportKind === 'type' || !node.source) return;
                for (const specifier of node.specifiers) {
                    if (specifier.exportKind === 'type') continue;
                    if (
                        buttonSubpath.test(node.source.value) ||
                        (antBarrels.has(node.source.value) && specifier.local?.name === 'Button')
                    ) {
                        report(specifier);
                    }
                }
            },
            ExportAllDeclaration(node) {
                if (
                    node.exportKind !== 'type' &&
                    (buttonSubpath.test(node.source.value) || antBarrels.has(node.source.value))
                ) {
                    report(node);
                }
            },
        };
    },
});

export function countLegacyButtons(source, filename) {
    if (!source.includes('antd')) return 0;
    const messages = linter.verify(
        source,
        {
            parser: 'typescript',
            parserOptions: { sourceType: 'module', ecmaVersion: 'latest', ecmaFeatures: { jsx: true } },
            rules: { [ruleName]: 'error' },
        },
        { filename, allowInlineConfig: false },
    );
    const fatal = messages.find((message) => message.fatal);
    if (fatal) throw new Error(`${filename}:${fatal.line} could not be parsed: ${fatal.message}`);
    return messages.filter((message) => message.ruleId === ruleName).length;
}

function sourceFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(filename);
        return entry.isFile() && /\.[cm]?[jt]sx?$/.test(filename) ? [filename] : [];
    });
}

export function readLegacyButtonUsage(directory) {
    return Object.fromEntries(
        sourceFiles(directory)
            .sort()
            .map((filename) => [
                filename.split(path.sep).join('/'),
                countLegacyButtons(readFileSync(filename, 'utf8'), filename),
            ])
            .filter(([, count]) => count > 0),
    );
}

export function compareLegacyButtonUsage(actual, baseline) {
    return [...new Set([...Object.keys(actual), ...Object.keys(baseline)])]
        .sort()
        .map((file) => ({ file, allowed: baseline[file] ?? 0, found: actual[file] ?? 0 }))
        .filter(({ allowed, found }) => allowed !== found);
}
