import { describe, expect, it } from 'vitest';

import { createIconReferenceMatcher, referencesIconFile } from './iconUsageMatch.mjs';

describe('referencesIconFile', () => {
    it('matches a relative import path', () => {
        expect(referencesIconFile("import { ReactComponent } from '../../resources/img/svg/x.svg';", 'x.svg')).toBe(
            true,
        );
    });

    it('matches a quoted bare file name and a css url()', () => {
        expect(referencesIconFile(`const icon = 'x.svg';`, 'x.svg')).toBe(true);
        expect(referencesIconFile('background: url(../svg/permissions/case_handover.svg);', 'case_handover.svg')).toBe(
            true,
        );
    });

    it('does not match an icon whose name is only a suffix of another icon', () => {
        const content = "import Arrow from '../svg/keyboard_arrow_down_24px.svg';";

        expect(referencesIconFile(content, 'x.svg')).toBe(false);
        expect(referencesIconFile(content, 'down_24px.svg')).toBe(false);
        expect(referencesIconFile(content, 'keyboard_arrow_down_24px.svg')).toBe(true);
    });

    it('does not match a prose mention in a comment', () => {
        expect(referencesIconFile('/* never touch a mask (case_handover.svg). */', 'case_handover.svg')).toBe(false);
    });

    it('does not match across a hyphen, underscore or dot boundary', () => {
        expect(referencesIconFile("import X from '../svg/x-v2.svg';", 'v2.svg')).toBe(false);
        expect(referencesIconFile("import G from '../svg/permissions/group_internal.svg';", 'internal.svg')).toBe(
            false,
        );
        expect(referencesIconFile("import I from '../svg/icons-editor.svg';", 'editor.svg')).toBe(false);
    });

    it('does not match an icon whose name is only a prefix of another icon', () => {
        const content = "import All from '../svg/user-management/all_users_filled.svg';";

        expect(referencesIconFile(content, 'all_users.svg')).toBe(false);
        expect(referencesIconFile(content, 'all_users_filled.svg')).toBe(true);
    });

    it('matches a file name at the very start of the content and before a query suffix', () => {
        expect(referencesIconFile('x.svg', 'x.svg')).toBe(true);
        expect(referencesIconFile("import url from '../svg/x.svg?url';", 'x.svg')).toBe(true);
    });

    it('escapes regex metacharacters in the file name', () => {
        expect(referencesIconFile("import A from '../svg/a.svg';", 'a.svg')).toBe(true);
        expect(referencesIconFile("import A from '../svg/axsvg';", 'a.svg')).toBe(false);
    });

    it('exposes a reusable matcher', () => {
        const matcher = createIconReferenceMatcher('add.svg');

        expect(matcher.test("import Add from '../svg/add.svg';")).toBe(true);
        expect(matcher.test("import Add from '../svg/theme-preview/add.svg';")).toBe(true);
        expect(matcher.test("import Padd from '../svg/padd.svg';")).toBe(false);
    });
});
