import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { agencyPostcodeRangeEndpointBase } from '../../appConfig';

export interface PostCodeRange {
    from: string;
    until: string;
}

/**
 * get postcode ranges of an agency
 * @param id - agency id
 * @return data
 */
const getAgencyPostCodeRange = (id: string) => {
    return fetchData({
        url: `${agencyPostcodeRangeEndpointBase}/${id}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }).then((data) => {
        const result: PostCodeRange[] = [];
        // eslint-disable-next-line no-underscore-dangle
        data._embedded.postcodeRanges.split(';').forEach((el: string) => {
            if (el === '') {
                return;
            }
            const items = el.split('-');
            result.push({
                from: items[0],
                until: items[1] || items[0],
            });
        });

        return result;
    });
};

export default getAgencyPostCodeRange;
