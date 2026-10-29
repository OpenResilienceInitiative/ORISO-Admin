import { temporaryAccountSettingsEndpoint } from '../../appConfig';
import type { TemporaryAccountSettings } from '../../types/TemporaryAccountSettings';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

const responseHandling = [
    FETCH_ERRORS.BAD_REQUEST,
    FETCH_ERRORS.CONFLICT,
    FETCH_ERRORS.FORBIDDEN,
    FETCH_ERRORS.CATCH_ALL_SILENT,
];

export const getTemporaryAccountSettings = () =>
    fetchData({
        url: temporaryAccountSettingsEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling,
    }) as Promise<TemporaryAccountSettings>;

export const updateTemporaryAccountSettings = (settings: TemporaryAccountSettings) =>
    fetchData({
        url: temporaryAccountSettingsEndpoint,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(settings),
        responseHandling: [...responseHandling, FETCH_SUCCESS.CONTENT],
    }) as Promise<TemporaryAccountSettings>;
