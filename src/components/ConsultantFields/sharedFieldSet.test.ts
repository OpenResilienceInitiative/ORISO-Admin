import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
 * The "share, don't duplicate" guard for #1015.
 *
 * Both consultant surfaces — the page form (src/pages/users/Edit) and the
 * quick-create dialog on the agency screen — used to declare their own copy of
 * the same fields. That is not a style problem: it is how the SAME person got
 * a different record depending on which screen created them (the tone was
 * hardcoded on one, the avatar was never asked for on one), and how a review
 * of either file could look complete while the other silently disagreed.
 *
 * The field set now lives in src/components/ConsultantFields, and this file is
 * the evidence that it is genuinely SHARED rather than merely moved. It
 * therefore has to detect a re-declaration however it is WRITTEN. Its first
 * version matched the text `name="field"`, which `name='field'` and
 * `name={'field'}` slip straight past — an assertion that cannot fail for the
 * case it exists to catch. It now reads the JSX itself.
 *
 * A failure here is NOT fixed by editing the list: add the field to
 * ConsultantFields and render it from there, or — if the surface genuinely
 * must not have it — pass it in `exclude`.
 */

const SRC = resolve(__dirname, '..', '..');

const readSource = (relativePath: string) => readFileSync(join(SRC, relativePath), 'utf8');

/** The antd field names the shared module registers. */
const SHARED_FIELD_NAMES = [
    'firstname',
    'lastname',
    'displayName',
    'internalDisplayName',
    'avatarKind',
    'avatarId',
    'salutation',
    'position',
    'title',
    'adminRemarks',
    'email',
    'username',
    'password',
    'passwordConfirmation',
    'formalLanguage',
    'isSupervisor',
    'isGroupchatConsultant',
    'absent',
    'absenceMessage',
];

const CALL_SITES = ['pages/users/Edit/index.tsx', 'components/CreateConsultantModal/index.tsx'];

/**
 * Every literal `name` a JSX element in this source binds a field to. Parsing
 * rather than matching text: quoting style and `{'…'}` braces are the author's
 * choice, and a guard that only understands one of them guards nothing.
 */
export const boundFieldNames = (source: string, fileName = 'source.tsx'): string[] => {
    const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const names: string[] = [];

    const visit = (node: ts.Node) => {
        if (ts.isJsxAttribute(node) && node.name.getText(parsed) === 'name') {
            const { initializer } = node;
            let literal: ts.Node | undefined;

            if (initializer && ts.isStringLiteral(initializer)) {
                literal = initializer;
            } else if (initializer && ts.isJsxExpression(initializer) && initializer.expression) {
                literal = initializer.expression;
            }

            if (literal && ts.isStringLiteralLike(literal)) {
                names.push(literal.text);
            }
        }
        ts.forEachChild(node, visit);
    };

    visit(parsed);

    return names;
};

const reDeclaredIn = (source: string) =>
    [...new Set(boundFieldNames(source))].filter((name) => SHARED_FIELD_NAMES.includes(name));

/**
 * Every string literal VALUE in a source, for the salutation guard below.
 *
 * Parsed for the same reason the field names are: its first version matched the text
 * `'counsellor_gender_neutral',`, which a copy written with double quotes — or one whose last
 * entry has no trailing comma — walks straight past. A guard that reports the single source of
 * truth while a second copy sits next to it is worse than no guard, because it stops anyone
 * looking. Quoting and punctuation are the author's choice; the literal is the fact.
 */
export const stringLiteralValues = (source: string, fileName = 'source.ts'): string[] => {
    const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const values: string[] = [];

    const visit = (node: ts.Node) => {
        if (ts.isStringLiteralLike(node)) {
            values.push(node.text);
        }
        ts.forEachChild(node, visit);
    };

    visit(parsed);

    return values;
};

/** The key a second copy of the salutation list would have to contain to be one. */
const SALUTATION_MARKER = 'counsellor_gender_neutral';

const declaresSalutations = (source: string, fileName: string) =>
    stringLiteralValues(source, fileName).includes(SALUTATION_MARKER);

describe('the duplicate detector itself', () => {
    /*
     * Fixtures, not real files: the guard has to go red for each of these, or
     * a call site could drift back into its own copy of the field set simply
     * by using a different quote.
     */
    it('catches a shared field declared with double quotes', () => {
        expect(reDeclaredIn('const A = () => <MuiFormField name="firstname" />;')).toEqual(['firstname']);
    });

    it('catches a shared field declared with single quotes', () => {
        expect(reDeclaredIn("const A = () => <MuiFormField name='firstname' />;")).toEqual(['firstname']);
    });

    it('catches a shared field declared as a JSX expression', () => {
        expect(reDeclaredIn("const A = () => <MuiSelectField name={'salutation'} />;")).toEqual(['salutation']);
        expect(reDeclaredIn('const A = () => <MuiSelectField name={`salutation`} />;')).toEqual(['salutation']);
    });

    it('leaves a field the shared set does not own alone', () => {
        expect(reDeclaredIn("const A = () => <MuiSelectField name='tenantId' />;")).toEqual([]);
    });

    /*
     * The same fixtures for the salutation guard. Each of these IS a second copy of the list;
     * the text-matching version it replaces saw only the first.
     */
    it.each([
        ['single quotes with a trailing comma', "const A = ['counsellor_gender_neutral',];"],
        ['double quotes', 'const A = ["counsellor_gender_neutral"];'],
        ['no trailing comma on the last entry', "const A = ['counsellor_male', 'counsellor_gender_neutral'];"],
        ['a template literal', 'const A = [`counsellor_gender_neutral`];'],
    ])('catches a second salutation list written with %s', (_label, source) => {
        expect(declaresSalutations(source, 'copy.ts')).toBe(true);
    });

    it('leaves a source that merely builds the i18n key alone', () => {
        // `counselor.salutation.option.counsellor_gender_neutral` is a translation lookup, not
        // a declaration of the option list.
        expect(declaresSalutations("const A = t('counselor.salutation.option.x');", 'lookup.ts')).toBe(false);
    });
});

describe('the consultant field set has exactly one declaration', () => {
    it.each(CALL_SITES)('%s renders the shared set instead of re-stating it', (callSite) => {
        expect(reDeclaredIn(readSource(callSite))).toEqual([]);
    });

    it.each(CALL_SITES)('%s imports the shared field set', (callSite) => {
        // Relative depth differs per call site; what matters is that it is THIS module.
        expect(readSource(callSite)).toMatch(/from '(\.\.\/)+(components\/)?ConsultantFields'/);
    });

    it('keeps the salutation option list in one place', () => {
        // Three surfaces offer it (this set, the onboarding wizard's
        // PersonalInfoCard, and through this set the quick-create dialog). They
        // used to hold a copy each, kept in step by a comment. A key added to
        // one list and not another reads back as an unknown salutation on the
        // surface that never learned about it.
        const sources = (dir: string): string[] =>
            readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
                const path = join(dir, entry.name);
                if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sources(path);
                return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
            });

        const declarations = sources(SRC)
            .filter((path) => declaresSalutations(readFileSync(path, 'utf8'), path))
            .map((path) => relative(SRC, path).split('\\').join('/'));

        expect(declarations).toEqual(['utils/salutationKeys.ts']);
    });

    it('keeps the credential policy in its single source, on both surfaces', () => {
        // The dialog used to inline the username pattern and the password
        // policy. Two copies of a security rule is one copy too many.
        CALL_SITES.forEach((callSite) => {
            const source = readSource(callSite);

            expect(source).not.toMatch(/\[a-z0-9_-\]/);
            expect(source).not.toContain('PASSWORD_POLICY');
            expect(source).not.toMatch(/\(\?=\.\*\[a-z\]\)/);
        });
    });
});
