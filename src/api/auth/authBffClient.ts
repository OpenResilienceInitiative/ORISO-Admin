import routePathNames from '../../appConfig';
import { LoginData } from '../../types/loginData';

const authBffBasePath = `${routePathNames.root}/auth`;

export const authSetTokenEndpoint = `${authBffBasePath}/set-token`;
export const authClearTokenEndpoint = `${authBffBasePath}/clear-token`;
export const authSessionEndpoint = `${authBffBasePath}/session`;
export const authRefreshTokenEndpoint = `${authBffBasePath}/refresh-token`;

export type AuthTokenPayload = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
};

const postJson = async (url: string, body: AuthTokenPayload): Promise<void> => {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Auth BFF request failed: ${response.status}`);
    }
};

export const setAuthTokensViaBff = async (payload: AuthTokenPayload): Promise<void> => {
    await postJson(authSetTokenEndpoint, payload);
};

export const clearAuthTokensViaBff = async (): Promise<void> => {
    await postJson(authClearTokenEndpoint, {});
};

export const bootstrapAuthSessionViaBff = async (): Promise<LoginData | null> => {
    const response = await fetch(authSessionEndpoint, {
        method: 'GET',
        credentials: 'include',
    });

    if (response.status === 204 || response.status === 401) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Auth session bootstrap failed: ${response.status}`);
    }

    return response.json();
};

export const refreshAuthTokensViaBff = async (): Promise<LoginData> => {
    const response = await fetch(authRefreshTokenEndpoint, {
        method: 'POST',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('keycloakLogin');
    }

    return response.json();
};
