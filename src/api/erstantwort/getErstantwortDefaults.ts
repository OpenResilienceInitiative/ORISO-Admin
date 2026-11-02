import { erstantwortDefaultsEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** `GET /useradmin/erstantwort/defaults` (ORISO-UserService#1423): the plain texts sent when a Baustein is left empty. */
export interface ErstantwortDefaultsDTO {
    locale?: string;
    greeting?: string;
    whoReadsAlong?: string;
    closing?: string;
    emergencyNumbers?: string;
    responseDeadline?: string;
    responseDeadlineDays?: number;
}

export const getErstantwortDefaults = async (informal: boolean): Promise<ErstantwortDefaultsDTO> => {
    const response = await fetchData({
        url: `${erstantwortDefaultsEndpoint}?locale=de&informal=${informal}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
    return response.json();
};
