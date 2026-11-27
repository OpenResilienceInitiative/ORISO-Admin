import { describe, expect, it } from 'vite-plus/test';
import { ownAddonTenant } from './AddonsLayout';

describe('ownAddonTenant', () => {
    it('mounts add-on pages for the platform, not for a Träger the platform admin picked', () => {
        expect(ownAddonTenant(true, 0, { id: 0, name: 'Plattform' })).toEqual({ id: 0, name: 'Plattform' });
    });

    it('uses the Träger from the token, and the loaded Träger when the token has none', () => {
        expect(ownAddonTenant(false, 7, { id: 9, name: 'Caritas &amp; Co' })).toEqual({ id: 7, name: 'Caritas & Co' });
        expect(ownAddonTenant(false, null, { id: '9' })).toEqual({ id: 9, name: undefined });
        expect(ownAddonTenant(false, null, undefined)).toBeNull();
    });
});
