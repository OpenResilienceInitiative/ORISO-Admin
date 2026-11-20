import { adminStatisticsSettingsEndpoint } from '../../appConfig';
import type {
    StatisticsSettingChange,
    StatisticsSettings,
    StatisticsSettingsUpdate,
} from '../../types/StatisticsSettings';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

const responseHandling = [
    FETCH_ERRORS.BAD_REQUEST,
    FETCH_ERRORS.CONFLICT,
    FETCH_ERRORS.FORBIDDEN,
    FETCH_ERRORS.CATCH_ALL_SILENT,
];

/** Global statistics settings (OBP #93). Platform admins only; the UserService enforces it. */
export const getStatisticsSettings = () =>
    fetchData({
        url: adminStatisticsSettingsEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling,
    }) as Promise<StatisticsSettings>;

export const updateStatisticsSettings = (update: StatisticsSettingsUpdate) =>
    fetchData({
        url: adminStatisticsSettingsEndpoint,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(update),
        responseHandling: [...responseHandling, FETCH_SUCCESS.CONTENT],
    }) as Promise<StatisticsSettings>;

export const getStatisticsSettingsHistory = () =>
    fetchData({
        url: `${adminStatisticsSettingsEndpoint}/history`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling,
    }) as Promise<StatisticsSettingChange[]>;
