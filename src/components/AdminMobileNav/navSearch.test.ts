import { describe, expect, it } from 'vitest';
import i18n from '../../i18n';
import routePathNames from '../../appConfig';
import { buildNavSearchEntries } from '../Layout/AdminMobileNavBar';
import type { AdminNavSubsection } from '../Layout/adminNavTree';
import { editDistance, normalizeSearchText, searchNav } from './navSearch';

const sections = [
    { key: 'theme', label: 'Einstellungen', to: `${routePathNames.themeSettings}/master-data` },
    { key: 'agency', label: 'Beratungsstellen', to: routePathNames.agency },
    { key: 'counselors', label: 'Konten', to: routePathNames.tenantAdmins },
    { key: 'logs', label: 'Logs', to: routePathNames.logs },
    { key: 'links', label: 'Links', to: routePathNames.links },
];

const tree: Record<string, AdminNavSubsection[]> = {
    theme: [
        { id: 'settings:master-data', to: '/s/master-data', labelKey: 'settings.subhead.masterData' },
        { id: 'settings:general', to: '/s/general', labelKey: 'settings.subhead.view' },
        { id: 'settings:legal', to: '/s/legal', labelKey: 'settings.subhead.legal' },
        { id: 'settings:smtp', to: '/s/smtp', labelKey: 'settings.subhead.smtp' },
        { id: 'settings:permissions', to: '/s/permissions', labelKey: 'settings.subhead.functionAccess' },
    ],
    counselors: [
        { id: 'users:tenant-admins', to: '/u/tenant-admins', labelKey: 'users.sectionPills.tenantAdmins' },
        { id: 'users:counsellors', to: '/u/consultants', labelKey: 'users.sectionPills.counsellors' },
    ],
    logs: [
        { id: 'logs:case-handover', to: '/l/case-handover', labelKey: 'sidebar.caseHandoverLogs' },
        { id: 'logs:deletions', to: '/l/deletions', labelKey: 'sidebar.deletionAudit' },
    ],
};

const entries = buildNavSearchEntries(
    i18n.getFixedT('de'),
    ['de', 'en'].map((language) => i18n.getFixedT(language)),
    sections,
    tree,
);

const top = (query: string) => searchNav(entries, query)[0]?.entry.id;

describe('normalizeSearchText', () => {
    it('folds case, umlauts and separators', () => {
        expect(normalizeSearchText('Lösch-Protokoll  E-Mail')).toBe('loesch protokoll e mail');
        expect(normalizeSearchText('Straße')).toBe('strasse');
    });
});

describe('editDistance', () => {
    it('counts a swapped letter as one typo', () => {
        expect(editDistance('emial', 'email', 2)).toBe(1);
        expect(editDistance('abc', 'xyz', 1)).toBe(2);
    });
});

describe('searchNav — the examples from ORISO-Admin#1319', () => {
    it.each([
        ['smtp', 'settings:smtp'],
        ['mail server', 'settings:smtp'],
        ['Mailserver', 'settings:smtp'],
        ['Emial', 'settings:smtp'],
        ['Datenschutz', 'settings:legal'],
        ['privacy', 'settings:legal'],
        ['impressum', 'settings:legal'],
        ['berater', 'users:counsellors'],
        ['counsellor', 'users:counsellors'],
        ['counselor', 'users:counsellors'],
        ['loeschen', 'logs:deletions'],
        ['löschen', 'logs:deletions'],
        ['deleted', 'logs:deletions'],
        ['Farbe', 'settings:general'],
        ['colour', 'settings:general'],
        ['appearance', 'settings:general'],
        ['Stammdatn', 'settings:master-data'],
        ['handover', 'logs:case-handover'],
        ['Fallübergabe', 'logs:case-handover'],
        ['permissions', 'settings:permissions'],
        ['Beratungsstele', 'agency'],
    ])('"%s" → %s', (query, expected) => {
        expect(top(query)).toBe(expected);
    });

    it('requires every word to match, so more words narrow the result', () => {
        expect(searchNav(entries, 'mail datenschutz')).toEqual([]);
    });

    it('returns nothing for an empty query or nonsense', () => {
        expect(searchNav(entries, '   ')).toEqual([]);
        expect(searchNav(entries, 'xqzvw')).toEqual([]);
    });

    it('does not guess on very short words', () => {
        expect(searchNav(entries, 'xy')).toEqual([]);
    });

    it('labels results in the UI language and names the section', () => {
        const [hit] = searchNav(entries, 'smtp');

        expect(hit.entry.label).toBe('Email Server');
        expect(hit.entry.sectionLabel).toBe('Einstellungen');
    });
});
