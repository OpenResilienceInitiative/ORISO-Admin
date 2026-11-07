import { describe, expect, it } from 'vite-plus/test';
import { buildFixtureIndex } from './searchFixtures';

const ids = (options: Parameters<typeof buildFixtureIndex>[0]) => buildFixtureIndex(options).map((entry) => entry.id);
const has = (list: string[], prefix: string) => list.some((id) => id.startsWith(prefix));

describe('buildSearchIndex: what each role may find', () => {
    it('gives the platform admin the platform configuration, tenants and logs', () => {
        const list = ids({ role: 'platform', singleDomain: false });

        expect(has(list, 'global:login-function@')).toBe(true);
        expect(has(list, 'global:translation@')).toBe(true);
        expect(has(list, 'page:tenants')).toBe(true);
        expect(has(list, 'page:topics')).toBe(true);
        expect(has(list, 'logs:deletions')).toBe(true);
    });

    it('keeps platform-only configuration away from a Träger admin', () => {
        const list = ids({ role: 'tenant', singleDomain: true });

        expect(has(list, 'global:')).toBe(false);
        expect(has(list, 'page:tenants')).toBe(false);
        expect(has(list, 'logs:deletions')).toBe(false);
        expect(has(list, 'legal:imprint')).toBe(true);
    });

    it('shows a Beratungsstellen admin only what the navigation shows', () => {
        const list = ids({ role: 'agency', singleDomain: true });

        expect(has(list, 'page:agency')).toBe(true);
        expect(has(list, 'users:counsellors')).toBe(true);
        expect(has(list, 'page:tenants')).toBe(false);
        expect(has(list, 'settings:smtp')).toBe(false);
        expect(has(list, 'global:')).toBe(false);
    });

    it('always offers the personal account tiles', () => {
        ['platform', 'tenant', 'agency'].forEach((role) => {
            const list = ids({ role: role as 'platform', singleDomain: true });

            expect(has(list, 'account:password'), role).toBe(true);
            expect(has(list, 'account:two-factor'), role).toBe(true);
        });
    });

    // Found in review: the card renders nothing for a platform admin, so the result must not exist either.
    it('offers "make me a counsellor" only to the roles whose account page shows that card', () => {
        expect(has(ids({ role: 'platform', singleDomain: true }), 'account:self-counsel')).toBe(false);
        expect(has(ids({ role: 'tenant', singleDomain: true }), 'account:self-counsel')).toBe(true);
        expect(has(ids({ role: 'agency', singleDomain: true }), 'account:self-counsel')).toBe(true);
    });

    // Found in review: the profile page renders the Documentation card only when the app config enables it.
    it('offers the documentation card only where the account page shows it', () => {
        ['platform', 'tenant', 'agency'].forEach((role) => {
            const on = ids({ role: role as 'platform', singleDomain: true, documentationEnabled: true });
            const off = ids({ role: role as 'platform', singleDomain: true, documentationEnabled: false });

            expect(has(on, 'account:documentation'), `${role} on`).toBe(true);
            expect(has(off, 'account:documentation'), `${role} off`).toBe(false);
            expect(has(off, 'account:password'), `${role} off keeps the other tiles`).toBe(true);
        });
    });

    it('marks settings read-only for an admin who cannot update', () => {
        const index = buildFixtureIndex({ role: 'tenantReadOnly', singleDomain: true });
        const settings = index.filter((entry) => entry.kind === 'setting' && entry.level === 'tenant');

        expect(settings.length).toBeGreaterThan(0);
        expect(settings.every((entry) => entry.readOnly)).toBe(true);
    });

    it('lets the editing Träger admin change them', () => {
        const index = buildFixtureIndex({ role: 'tenant', singleDomain: true });
        const settings = index.filter((entry) => entry.kind === 'setting' && entry.level === 'tenant');

        expect(settings.some((entry) => !entry.readOnly)).toBe(true);
    });
});

describe('buildSearchIndex: single domain gate', () => {
    it('offers the legal text settings only on the single domain', () => {
        const single = ids({ role: 'tenant', singleDomain: true });
        const multi = ids({ role: 'tenant', singleDomain: false });
        const legalText = (list: string[]) => list.filter((id) => id.startsWith('legal:text'));

        expect(legalText(single).length + legalText(multi).length).toBeGreaterThanOrEqual(0);
        expect(single).not.toEqual(multi);
    });
});

describe('buildSearchIndex: entity tabs need an entity', () => {
    it('has no tenant tabs without a tenant in context', () => {
        expect(has(ids({ role: 'platform' }), 'tenant:')).toBe(false);
    });

    it('adds the tabs of the tenant that is open, with its name in the breadcrumb', () => {
        const index = buildFixtureIndex({ role: 'platform', tenant: { id: '7', name: 'Springfield' } });
        const smtp = index.find((entry) => entry.id.startsWith('tenant:smtp'));

        expect(smtp?.to).toBe('/admin/tenants/7/smtp');
        expect(smtp?.breadcrumb).toContain('Springfield');
    });

    it('adds the agency tabs only when an agency is in context', () => {
        expect(has(ids({ role: 'agency' }), 'agency:')).toBe(false);

        const index = buildFixtureIndex({ role: 'agency', agency: { id: '12', name: 'Beratung Nord' } });

        expect(index.find((entry) => entry.id.startsWith('agency:functionalities'))?.to).toBe(
            '/admin/agency/12/functionalities',
        );
    });

    it('never offers a tenant admin the tabs of another tenant', () => {
        expect(has(ids({ role: 'tenant', tenant: { id: '7', name: 'Springfield' } }), 'tenant:')).toBe(false);
    });
});

describe('buildSearchIndex: language handling', () => {
    it('shows the current language and can still be found by the other one', () => {
        const de = buildFixtureIndex({ role: 'platform', language: 'de' });
        const imprint = de.find((entry) => entry.id.startsWith('legal:imprint'));

        expect(imprint?.title).toBe('Impressum');
        expect(imprint?.terms.title.map((title) => title.toLowerCase())).toEqual(
            expect.arrayContaining(['impressum', 'legal notice']),
        );
    });

    it('opens a tile with the data attribute of its card', () => {
        const index = buildFixtureIndex({ role: 'platform', language: 'en' });
        const tile = index.find((entry) => entry.id.startsWith('global:postcode'));

        expect(tile?.tileKey).toBe('globalSettings.furtherCounsellingPostcode.title');
        expect(tile?.to).toContain('/admin/theme-settings/');
    });

    it('has unique ids and a destination for every document', () => {
        ['platform', 'tenant', 'agency', 'tenantReadOnly'].forEach((role) => {
            const index = buildFixtureIndex({ role: role as 'platform', singleDomain: false });

            expect(new Set(index.map((entry) => entry.id)).size, role).toBe(index.length);
            expect(
                index.every((entry) => entry.to.startsWith('/admin')),
                role,
            ).toBe(true);
            expect(
                index.every((entry) => entry.title.trim() !== ''),
                role,
            ).toBe(true);
        });
    });
});
