import { message } from 'antd';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAccessTokenForRequests } from '../api/auth/auth';
import parseJwt from '../utils/parseJWT';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '../utils/language';
import { addonApiCall } from './addonApiCall';
import {
    ADDON_CONTRACT,
    ADMIN_PAGE_SLOT,
    type AddonApp,
    type AddonHostProps,
    type AddonNotice,
    type AvailableAddon,
} from './addonTypes';

/** The tenant colours the admin theme set as custom properties on the root element. */
export const readThemeTokens = (root: HTMLElement = document.documentElement) => {
    const tokens: Record<string, string> = {};
    for (let index = 0; index < root.style.length; index += 1) {
        const name = root.style.item(index);
        if (name.startsWith('--')) {
            tokens[name] = root.style.getPropertyValue(name).trim();
        }
    }
    return tokens;
};

export const readAddonUser = (token: string | null | undefined = getAccessTokenForRequests()) => {
    const payload = token ? parseJwt(token) : null;
    return {
        id: typeof payload?.sub === 'string' ? payload.sub : '',
        username: typeof payload?.preferred_username === 'string' ? payload.preferred_username : '',
        roles: Array.isArray(payload?.realm_access?.roles) ? (payload.realm_access.roles as string[]) : [],
    };
};

/** Longest text an add-on can show; longer text is cut, so a notice stays a notice. */
const NOTICE_MAX_LENGTH = 300;

const plainText = (value: unknown) => (typeof value === 'string' ? value.slice(0, NOTICE_MAX_LENGTH) : '');

/**
 * Shows an add-on's `notify` call with antd's `message`, as ORISO-Admin does for its own
 * feedback. Unknown types become `info`; title and text are plain strings (rendered as text).
 */
export const showAddonNotice = (notice: AddonNotice, show: typeof message = message) => {
    const text = plainText(notice?.text);
    if (!text) {
        return;
    }
    const title = plainText(notice.title);
    const content = title ? `${title}: ${text}` : text;
    const type = (['success', 'info', 'warning', 'error'] as const).includes(notice.type) ? notice.type : 'info';
    show[type]({ content, duration: type === 'error' || type === 'warning' ? 8 : 4 });
};

export interface AddonTenant {
    id?: number;
    name?: string;
}

export const useAddonHostProps = (
    addon: AvailableAddon,
    app: AddonApp,
    tenant: AddonTenant,
): Omit<AddonHostProps, 'domElement'> => {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const goTo = useCallback((to: string) => navigate(to), [navigate]);
    const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language) || DEFAULT_LANGUAGE;
    const locale = language.split('@')[0];

    return useMemo(
        () => ({
            contract: ADDON_CONTRACT,
            addon: { name: addon.name, version: addon.version },
            app: { id: app.id },
            slot: ADMIN_PAGE_SLOT,
            user: readAddonUser(),
            tenant: { id: tenant.id, name: tenant.name },
            locale,
            informal: false,
            theme: readThemeTokens(),
            api: addonApiCall(addon),
            navigate: goTo,
            notify: (notice: AddonNotice) => showAddonNotice(notice),
        }),
        [addon, app.id, tenant.id, tenant.name, locale, goTo],
    );
};
