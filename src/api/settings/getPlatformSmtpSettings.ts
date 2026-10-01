import { globalSmtpPlatformSettingsEndpoint } from '../../appConfig';
import { fetchData, FETCH_METHODS } from '../fetchData';

export interface PlatformSmtpSettingsSummary {
    host: string | null;
    port: number | null;
    secure: boolean | null;
    from: string | null;
    configured: boolean;
    credentialsPresent: boolean;
}

export const getPlatformSmtpSettings = (): Promise<PlatformSmtpSettingsSummary> =>
    fetchData({
        url: globalSmtpPlatformSettingsEndpoint,
        method: FETCH_METHODS.GET,
        responseHandling: [],
    });
