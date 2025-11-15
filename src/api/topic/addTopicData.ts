import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { topicEndpoint } from '../../appConfig';

function buildTopicDataRequestBody(formData: Record<string, any>) {
    return JSON.stringify({
        // diocese in case of SAAS is not relevant object but enforced by API
        dioceseId: 0,
        name: formData.name,
        description: formData.description,
        internalIdentifier: formData.internalIdentifier,
        status: formData.status ? 'ACTIVE' : 'INACTIVE',
        // enforced by admin API, without business value for SAAS
        external: false,
    });
}

async function createTopic(topicDataRequestBody: string) {
    return fetchData({
        url: topicEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: topicDataRequestBody,
    }).then((addTopicResponse) => {
        return addTopicResponse.json();
    });
}

/**
 * add new topic
 * @param topicData
 * @return data
 */
async function addTopicData(topicData: Record<string, any>) {
    const topicDataRequestBody = buildTopicDataRequestBody(topicData);
    return createTopic(topicDataRequestBody);
}

export default addTopicData;
