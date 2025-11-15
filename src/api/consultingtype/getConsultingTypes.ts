import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { consultingTypeEndpoint } from '../../appConfig';

export default async function getConsultingTypes(): Promise<any[]> {
    const consultingTypeResponse = await fetchData({
        url: `${consultingTypeEndpoint}/basic`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });

    return consultingTypeResponse;
}
