import { describe, expect, it } from 'vitest';
import translationDe from '../../../locales/de/translation.json';
import translationEn from '../../../locales/en/translation.json';

/**
 * Role and navigation wording in the Accounts section is agreed with the
 * client (ORISO-Admin#676). Plural forms are mandatory for "Beratende",
 * because any singular form would pick a gender.
 */

const de = translationDe as Record<string, string>;
const en = translationEn as Record<string, string>;

describe('accounts section wording (ORISO-Admin#676)', () => {
    it('names the four role pills in German', () => {
        expect(de['users.sectionPills.platformAdmins']).toBe('Plattform Admins');
        expect(de['users.sectionPills.tenantAdmins']).toBe('Träger Admins');
        expect(de['users.sectionPills.counsellorAdmins']).toBe('Beratungsstellen Admins');
        expect(de['users.sectionPills.counsellors']).toBe('Beratende');
    });

    it('names the four role pills in English', () => {
        expect(en['users.sectionPills.platformAdmins']).toBe('Platform Admins');
        expect(en['users.sectionPills.tenantAdmins']).toBe('Tenant Admins');
        expect(en['users.sectionPills.counsellorAdmins']).toBe('Agency Admins');
        expect(en['users.sectionPills.counsellors']).toBe('Counselors');
    });

    it('names the accounts and agencies menu entries', () => {
        expect(de['sidebar.users']).toBe('Konten');
        expect(de['users.allUsers']).toBe('Konten');
        expect(de['sidebar.agency']).toBe('Beratungsstellen');

        expect(en['sidebar.users']).toBe('Accounts');
        expect(en['users.allUsers']).toBe('Accounts');
        expect(en['sidebar.agency']).toBe('Agencies');
    });
});
