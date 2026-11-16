import { erstantwortPlatformEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import type { PlatformTextMap } from '../../components/Tenants/AppSettings/ErstantwortSettings/PlatformGreeting/platformGreeting';

/** `GET|PUT /useradmin/erstantwort/platform`: the platform admin's texts plus the built-in defaults. */
export interface ErstantwortPlatformTextsDTO {
    /** Baustein → language → HTML (plus `<lang>__meta`); absent = the built-in default applies. */
    texts: PlatformTextMap;
    /** Baustein → language → plain text: the Caritas default shipped with every install. */
    builtIn: PlatformTextMap;
}

export const getErstantwortPlatformTexts = async (): Promise<ErstantwortPlatformTextsDTO> => {
    const response = await fetchData({
        url: erstantwortPlatformEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
    return response.json();
};

export const putErstantwortPlatformTexts = async (texts: PlatformTextMap): Promise<ErstantwortPlatformTextsDTO> => {
    const response = await fetchData({
        url: erstantwortPlatformEndpoint,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify({ texts }),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
    return response.json();
};
