import { serverSettingsEndpoint } from '../../appConfig';
import { ServerAppConfigInterface } from '../../types/ServerAppConfigInterface';
import { fetchData, FETCH_METHODS } from '../fetchData';

export const apiServerSettings = async (): Promise<ServerAppConfigInterface> =>
    fetchData({
        url: serverSettingsEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: true,
        responseHandling: [],
    });
