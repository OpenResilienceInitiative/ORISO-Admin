import { describe, expect, it } from 'vitest';
import { isEmptyLegalContent, resolveLegalHelpKey } from './legalHelpTexts';

describe('isEmptyLegalContent', () => {
    it.each([
        [undefined, true],
        [null, true],
        ['', true],
        ['<p></p>', true],
        ['<p>Impressum</p>', false],
        // HTML whitespace entities / non-breaking / zero-width whitespace count as empty.
        ['<p>&nbsp;</p>', true],
        ['<p>&#160;</p>', true],
        ['<p>&#xA0;</p>', true],
        ['<p>\u00a0</p>', true],
        ['<p>\u200b</p>', true],
        ['<p><br></p>', true],
        ['<p>&nbsp;Text</p>', false],
        [{}, true],
        [{ de: '<p></p>', en: '' }, true],
        [{ de: '<p>&nbsp;</p>', en: '<p><br></p>' }, true],
        [{ de: '<p>Text</p>' }, false],
    ])('%j → %s', (value, expected) => {
        expect(isEmptyLegalContent(value)).toBe(expected);
    });
});

describe('resolveLegalHelpKey', () => {
    it.each([
        ['dpa', 'platform', { empty: true, readOnly: false }, 'legal.help.dpa.platform.empty'],
        ['dpa', 'platform', { empty: false, readOnly: false }, 'legal.help.dpa.platform.published'],
        ['dpa', 'tenant', { empty: false, readOnly: false }, 'legal.help.dpa.tenant.unsigned'],
        ['dpa', 'tenant', { empty: false, readOnly: true }, 'legal.help.dpa.tenant.signed'],
        ['dpa', 'agency', { empty: false, readOnly: true }, 'legal.help.dpa.agency.published'],
        ['privacy', 'platform', { empty: true, readOnly: false }, 'legal.help.privacy.platform.empty'],
        ['privacy', 'platform', { empty: false, readOnly: false }, 'legal.help.privacy.platform.published'],
        ['privacy', 'tenant', { empty: true, readOnly: false }, 'legal.help.privacy.tenant.draft'],
        ['privacy', 'tenant', { empty: false, readOnly: false }, 'legal.help.privacy.tenant.published'],
        ['privacy', 'agency', { empty: false, readOnly: false }, 'legal.help.privacy.agency.inherited'],
        ['privacy', 'agency', { empty: false, readOnly: true }, 'legal.help.privacy.agency.inheritedReadOnly'],
        ['imprint', 'platform', { empty: true, readOnly: false }, 'legal.help.imprint.platform.empty'],
        ['imprint', 'platform', { empty: false, readOnly: false }, 'legal.help.imprint.platform.published'],
        ['imprint', 'tenant', { empty: true, readOnly: false }, 'legal.help.imprint.tenant.draft'],
        ['imprint', 'tenant', { empty: false, readOnly: false }, 'legal.help.imprint.tenant.published'],
        ['imprint', 'agency', { empty: false, readOnly: false }, 'legal.help.imprint.agency.inherited'],
        ['imprint', 'agency', { empty: false, readOnly: true }, 'legal.help.imprint.agency.inheritedReadOnly'],
    ] as const)('%s / %s / %o → %s', (type, role, context, expected) => {
        expect(resolveLegalHelpKey(type, role, context)).toBe(expected);
    });
});
