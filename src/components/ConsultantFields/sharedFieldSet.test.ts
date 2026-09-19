import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
 * The field set now lives in src/components/ConsultantFields. This test reads
 * the two call sites as text and fails if either of them starts re-declaring a
 * field the shared module owns. A failure here is NOT fixed by editing the
 * list: add the field to ConsultantFields and render it from there, or — if
 * the surface genuinely must not have it — pass it in `exclude`.
 */

const readSource = (relativePath: string) => readFileSync(resolve(__dirname, '..', '..', relativePath), 'utf8');

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

describe('the consultant field set has exactly one declaration', () => {
    it.each(CALL_SITES)('%s renders the shared set instead of re-stating it', (callSite) => {
        const source = readSource(callSite);

        const reDeclared = SHARED_FIELD_NAMES.filter((field) => source.includes(`name="${field}"`));

        expect(reDeclared).toEqual([]);
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
        const declarations = execSync('grep -rl "\'counsellor_gender_neutral\'," src --include=*.ts --include=*.tsx', {
            cwd: resolve(__dirname, '..', '..', '..'),
            encoding: 'utf8',
        })
            .trim()
            .split('\n')
            // A test may state the keys it expects; only PRODUCTION copies count.
            .filter((file) => !file.includes('.test.'));

        expect(declarations).toEqual(['src/utils/salutationKeys.ts']);
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
