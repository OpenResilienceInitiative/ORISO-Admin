import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UseAppConfigProvider } from '../../context/useAppConfig';
import { FeatureProvider } from '../../context/FeatureContext';
import { setSessionTokens } from '../../api/auth/tokenSessionStore';
import type { UserRole } from '../../enums/UserRole';
import type { TenantData } from '../../types/tenant';

/**
 * Storybook-only helpers for rendering admin **page-tree organisms** (#285). These pages
 * read app state that Storybook's global preview does not provide:
 *   - `useAppConfigContext` throws when there is no `UseAppConfigProvider`;
 *   - `useUserRoles` derives permissions from the JWT in the in-memory token store.
 * `withAdminProviders` supplies the contexts; `setStoryAuth` installs a fake token so the
 * permission-gated UI (create buttons, editable columns) renders. No real auth is involved.
 */

const toBase64Url = (value: object): string =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Install a fake (unsigned) access token so `useUserRoles` resolves the given roles/tenant. */
export const setStoryAuth = (roles: UserRole[], tenantId = 0): void => {
    const header = toBase64Url({ alg: 'none', typ: 'JWT' });
    const payload = toBase64Url({ realm_access: { roles }, tenantId, exp: 9_999_999_999 });
    setSessionTokens(`${header}.${payload}.storybook`, 'storybook-refresh');
};

const STORY_TENANT = { id: 1, name: 'Demo-Mandant', settings: {}, licensing: {} } as unknown as TenantData;

/**
 * Wrap a story in the admin app contexts (config + features) with a fresh React Query
 * cache (so a story's "loading" state is not served a sibling story's cached data).
 */
export const withAdminProviders = (Story: () => ReactElement): ReactElement => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <UseAppConfigProvider>
            <FeatureProvider tenantData={STORY_TENANT} publicTenantData={STORY_TENANT}>
                <Story />
            </FeatureProvider>
        </UseAppConfigProvider>
    </QueryClientProvider>
);
