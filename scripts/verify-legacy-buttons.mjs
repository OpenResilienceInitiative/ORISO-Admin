import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';

const linter = new Linter();
const ruleName = 'check-legacy-antd-components';
const antBarrel = /^antd(?:\/(?:es|lib)(?:\/index(?:\.js)?)?)?\/?$/;
const buttonSubpath = /^antd\/(?:es|lib)\/button(?:\/|$)/;
const componentSubpath = /^antd\/(?:es|lib)\/(?:button|slider)(?:\/|$)/;
const restrictedMembers = new Set(['Button', 'Slider', 'default']);
const wrappers = new Set([
    'AwaitExpression',
    'ChainExpression',
    'TSAsExpression',
    'TSNonNullExpression',
    'TSTypeAssertion',
    'TSSatisfiesExpression',
]);

function literalString(node) {
    if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
    if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked;
    return null;
}

function allowedKey(node, computed) {
    const member = !computed && node.type === 'Identifier' ? node.name : literalString(node);
    return Boolean(member) && !restrictedMembers.has(member);
}

function onlyReadsOtherMembers(node) {
    let expression = node;
    while (wrappers.has(expression.parent?.type)) expression = expression.parent;
    const use = expression.parent;
    if (use?.type === 'MemberExpression' && use.object === expression) {
        return allowedKey(use.property, use.computed);
    }
    return (
        use?.type === 'VariableDeclarator' &&
        use.init === expression &&
        use.id.type === 'ObjectPattern' &&
        use.id.properties.length > 0 &&
        use.id.properties.every(
            (property) => property.type === 'Property' && allowedKey(property.key, property.computed),
        )
    );
}

linter.defineParser('typescript', parser);
linter.defineRule(ruleName, {
    meta: { messages: { button: 'Ant Design Button usage', runtime: 'Legacy Ant Design runtime import' } },
    create(context) {
        const report = (node) => context.report({ node, messageId: 'button' });
        const checkRuntime = (node, source) => {
            const module = literalString(source);
            const computedAntPath =
                source?.type === 'TemplateLiteral' &&
                source.expressions.length > 0 &&
                source.quasis[0].value.cooked?.startsWith('antd/');
            if (
                computedAntPath ||
                (module && (componentSubpath.test(module) || (antBarrel.test(module) && !onlyReadsOtherMembers(node))))
            ) {
                context.report({ node: source, messageId: 'runtime' });
            }
        };
        return {
            ImportExpression(node) {
                checkRuntime(node, node.source);
            },
            CallExpression(node) {
                if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
                    checkRuntime(node, node.arguments[0]);
                }
            },
            TSExternalModuleReference(node) {
                if (node.parent.importKind !== 'type') checkRuntime(node, node.expression);
            },
            ImportDeclaration(node) {
                if (node.importKind === 'type') return;
                const module = node.source.value;
                if (buttonSubpath.test(module) && node.specifiers.length === 0) report(node);
                for (const specifier of node.specifiers) {
                    if (specifier.importKind === 'type') continue;
                    const importsButton =
                        buttonSubpath.test(module) ||
                        (antBarrel.test(module) &&
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
                        (antBarrel.test(node.source.value) && specifier.local?.name === 'Button')
                    ) {
                        report(specifier);
                    }
                }
            },
            ExportAllDeclaration(node) {
                if (
                    node.exportKind !== 'type' &&
                    (buttonSubpath.test(node.source.value) || antBarrel.test(node.source.value))
                ) {
                    report(node);
                }
            },
        };
    },
});

export function inspectLegacyAntd(source, filename) {
    if (!/antd|\\(?:[ux]|\r?\n)/.test(source)) return { buttons: 0, runtimeImports: [] };
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
    return {
        buttons: messages.filter((message) => message.messageId === 'button').length,
        runtimeImports: messages
            .filter((message) => message.messageId === 'runtime')
            .map(({ line, column }) => ({ file: filename, line, column })),
    };
}

function sourceFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(filename);
        return entry.isFile() && /\.[cm]?[jt]sx?$/.test(filename) ? [filename] : [];
    });
}

export function readLegacyAntdUsage(directories) {
    const buttonUsage = {};
    const runtimeImports = [];
    for (const filename of directories.flatMap(sourceFiles).sort()) {
        const name = filename.split(path.sep).join('/');
        const found = inspectLegacyAntd(readFileSync(filename, 'utf8'), name);
        if (found.buttons > 0) buttonUsage[name] = found.buttons;
        runtimeImports.push(...found.runtimeImports);
    }
    return { buttonUsage, runtimeImports };
}

export function compareLegacyButtonUsage(actual, baseline) {
    return [...new Set([...Object.keys(actual), ...Object.keys(baseline)])]
        .sort()
        .map((file) => ({ file, allowed: baseline[file] ?? 0, found: actual[file] ?? 0 }))
        .filter(({ allowed, found }) => allowed !== found);
}
