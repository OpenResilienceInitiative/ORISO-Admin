import { FETCH_ERRORS, fetchData } from '../fetchData';
import { agencyPostcodeRangeEndpointBase } from '../../appConfig';
import { PostCodeRange } from './getAgencyPostCodeRange';

/**
 * add new agency postcode range
 * @param agencyData
 * @return data
 */
const updateAgencyPostCodeRange = (id: string, postCodesForm: PostCodeRange[], method: string) => {
    const postcodeRangeTmp = postCodesForm?.map((postCode) => `${postCode.from}-${postCode.until}`).join(';');
    const postcodeRange = `${postcodeRangeTmp || '00000-99999'};`;
    // const postcodeRange = getPostCodeRangeRequestBodyFromForm(formData);
    if (method === 'POST') {
        return fetchData({
            url: `${agencyPostcodeRangeEndpointBase}/${id}`,
            method: 'POST',
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL],
            bodyData: JSON.stringify({ postcodeRanges: postcodeRange }),
        }).then(() => id);
    }
    return fetchData({
        url: `${agencyPostcodeRangeEndpointBase}/${id}`,
        method: 'DELETE',
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    })
        .catch(() => null)
        .then(() => {
            return fetchData({
                url: `${agencyPostcodeRangeEndpointBase}/${id}`,
                method: 'POST',
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
                bodyData: JSON.stringify({ postcodeRanges: postcodeRange }),
            });
        });
};

export default updateAgencyPostCodeRange;
