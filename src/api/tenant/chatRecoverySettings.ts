import { tenantAdminEndpoint } from '../../appConfig';
import type { ChatRecoverySettings } from '../../types/ChatRecoverySettings';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

const url = `${tenantAdminEndpoint}/controls/chat-recovery`;
const responseHandling = [
    FETCH_ERRORS.BAD_REQUEST,
    FETCH_ERRORS.CONFLICT,
    FETCH_ERRORS.FORBIDDEN,
    FETCH_ERRORS.CATCH_ALL_SILENT,
];

export const getChatRecoverySettings = () =>
    fetchData({ url, method: FETCH_METHODS.GET, skipAuth: false, responseHandling }) as Promise<ChatRecoverySettings>;

export const updateChatRecoverySettings = (settings: ChatRecoverySettings) =>
    fetchData({
        url,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(settings),
        responseHandling: [...responseHandling, FETCH_SUCCESS.CONTENT],
    }) as Promise<ChatRecoverySettings>;
