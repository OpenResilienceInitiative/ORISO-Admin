import { beforeEach, describe, expect, it } from 'vitest';
import { clearAdminLocalStorage } from './clearAdminWebStorage';

// Keys the counselling app writes on the same origin (dev.oriso.org/app), taken from
// ORISO-Frontend. Losing matrix_device_id means a new Matrix device on the next app login.
const APP_KEYS = [
    'auth.access_token_valid_until',
    'auth.refresh_token_valid_until',
    'auth.keycloak',
    'matrix_access_token',
    'matrix_device_id',
    'matrix_device_id:@spider_pig:dev.oriso.org',
    'matrix_user_id',
    'loglevel:matrix',
    'locale',
    'i18next_res_de-translation',
    'oriso.displayFilters.v1',
    'oriso_liveChatAvailability',
    'error_boundary',
];

const ADMIN_KEYS = [
    'oriso-admin.auth.access_token_valid_until',
    'oriso-admin.language',
    'oriso-admin.legal.draft.privacy.tenant-1',
    'oriso-admin.legal.dpa.warning.dismissed.tenant-1',
    'oriso.admin.statistics.metricPreferences.v1.user-1',
    'oriso:tenantAdminControls.allowedPermissionToggles.appearance',
    'something-nobody-registered',
];

describe('clearAdminLocalStorage', () => {
    beforeEach(() => {
        localStorage.clear();
        [...APP_KEYS, ...ADMIN_KEYS].forEach((key) => localStorage.setItem(key, 'value'));
    });

    it('leaves the counselling app signed in and on the same Matrix device', () => {
        clearAdminLocalStorage();

        APP_KEYS.forEach((key) => expect(localStorage.getItem(key), key).toBe('value'));
    });

    it('removes everything else, so no Admin data survives a logout on a shared computer', () => {
        clearAdminLocalStorage();

        ADMIN_KEYS.forEach((key) => expect(localStorage.getItem(key), key).toBeNull());
        expect(localStorage.length).toBe(APP_KEYS.length);
    });
});
