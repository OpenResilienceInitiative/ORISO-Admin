import { useQuery } from '@tanstack/react-query';
import { getPlatformSmtpSettings } from '../api/settings/getPlatformSmtpSettings';

export const usePlatformSmtpSettings = () =>
    useQuery({
        queryKey: ['PLATFORM_SMTP_SETTINGS'],
        queryFn: getPlatformSmtpSettings,
        retry: false,
        refetchOnWindowFocus: false,
    });
