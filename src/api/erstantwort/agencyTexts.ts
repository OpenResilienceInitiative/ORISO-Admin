import { erstantwortAgencyEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import type { ErstantwortContentMap } from '../../components/Tenants/AppSettings/ErstantwortSettings/ErstantwortTextsCard';
import type { ErstantwortBausteinKey } from '../../components/Tenants/AppSettings/ErstantwortSettings/erstantwortBausteine';

/** Admin field key ↔ UserService Baustein id. */
const TO_BACKEND: Partial<Record<ErstantwortBausteinKey, string>> = {
    erstantwortGreeting: 'greeting',
    erstantwortWhoReadsAlong: 'whoReadsAlong',
    erstantwortFreeNotice: 'freeNotice',
    erstantwortClosing: 'closing',
};
const FROM_BACKEND = Object.fromEntries(Object.entries(TO_BACKEND).map(([admin, id]) => [id, admin])) as Record<
    string,
    ErstantwortBausteinKey
>;

type BackendTexts = Record<string, Record<string, string>>;

export const fromBackend = (texts: BackendTexts | undefined): ErstantwortContentMap => {
    const content: ErstantwortContentMap = {};
    Object.entries(texts ?? {}).forEach(([id, map]) => {
        const key = FROM_BACKEND[id];
        if (key) content[key] = { ...map };
    });
    return content;
};

export const toBackend = (content: Record<string, unknown>): BackendTexts => {
    const texts: BackendTexts = {};
    Object.entries(content).forEach(([key, map]) => {
        const id = TO_BACKEND[key as ErstantwortBausteinKey];
        if (id && map && typeof map === 'object') texts[id] = map as Record<string, string>;
    });
    return texts;
};

/** `GET /useradmin/erstantwort/agencies/{agencyId}`: the centre's own texts, per language with `__meta`. */
export const getAgencyErstantwort = async (agencyId: string | number): Promise<ErstantwortContentMap> => {
    // GET already resolves to the parsed body. A second .json() throws, and the centre greeting never loads.
    const body = (await fetchData({
        url: `${erstantwortAgencyEndpoint}/${agencyId}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    })) as { texts?: BackendTexts };
    return fromBackend(body.texts);
};

export const putAgencyErstantwort = async (
    agencyId: string | number,
    content: Record<string, unknown>,
): Promise<ErstantwortContentMap> => {
    const response = await fetchData({
        url: `${erstantwortAgencyEndpoint}/${agencyId}`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify({ texts: toBackend(content) }),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
    const body = (await response.json()) as { texts?: BackendTexts };
    return fromBackend(body.texts);
};
