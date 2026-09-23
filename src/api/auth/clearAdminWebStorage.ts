/**
 * The Admin runs on the same origin as the counselling app (dev.oriso.org/admin next to
 * dev.oriso.org/app), so both write into one localStorage. `localStorage.clear()` on an Admin
 * logout therefore ended the app session and dropped its Matrix device id. Keys the app owns stay;
 * everything else goes, so no Admin data survives a logout on a shared computer.
 */
const APP_OWNED_KEYS: RegExp[] = [
    /^auth\./, // token expiry and token copies
    /^matrix_/, // Matrix session and device id
    /^loglevel:/, // matrix-js-sdk log level
    /^i18next_res_/, // translation cache
    /^locale$/,
    /^oriso\.(?!admin\.)/, // app stores; the Admin's own keys are oriso-admin.*, oriso.admin.* and oriso:*
    /^(oriso|caritas)_liveChatAvailability$/,
    /^error_boundary$/,
];

const isAppOwnedKey = (key: string): boolean => APP_OWNED_KEYS.some((pattern) => pattern.test(key));

export const clearAdminLocalStorage = (): void => {
    try {
        const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
        keys.forEach((key) => {
            if (key !== null && !isAppOwnedKey(key)) {
                localStorage.removeItem(key);
            }
        });
    } catch {
        // storage unavailable — nothing to clear
    }
};
