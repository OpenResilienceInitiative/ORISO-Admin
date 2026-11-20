import { serviceNoticeDraftsEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

export const SERVICE_NOTICE_VARIANTS = ['de-sie', 'de-du', 'en', 'fr', 'ru', 'ti', 'tr'] as const;
export type ServiceNoticeVariant = (typeof SERVICE_NOTICE_VARIANTS)[number];

export interface ServiceNoticeDraftInput {
    maintenanceDate: string;
    maintenanceStart: string;
    maintenanceEnd: string;
    statusUrl: string;
}

export interface ServiceNoticeDraft extends ServiceNoticeDraftInput {
    campaignKey: string;
    status: 'DRAFT' | 'CONFIRMED';
}

/** Counts only, computed server-side: the browser never sees or supplies recipient addresses. */
export interface ServiceNoticeDryRun {
    campaignKey: string;
    audience: 'AGENCY_ADMINS';
    recipients: number;
    mail: number;
    feedOnlyPreferenceOff: number;
    feedOnlyNoAddress: number;
    feedOnlyNoSenderTenant: number;
}

export interface ServiceNoticeConfirmed {
    campaignKey: string;
    status: 'CONFIRMED';
    recipients: number;
    mailQueued: number;
    alreadyConfirmed: boolean;
}

export interface ServiceNoticePreview {
    campaignKey: string;
    variant: ServiceNoticeVariant;
    subject: string;
    preheader: string;
    html: string;
    text: string;
}

const responseHandling = [FETCH_SUCCESS.CONTENT, FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE, FETCH_ERRORS.CATCH_ALL_SILENT];
const draftUrl = (campaignKey: string) => `${serviceNoticeDraftsEndpoint}/${encodeURIComponent(campaignKey)}`;

/** Draft-only operation. Identical retry is server-idempotent; changed references are never invented here. */
export const saveServiceNoticeDraft = (
    campaignKey: string,
    input: ServiceNoticeDraftInput,
): Promise<ServiceNoticeDraft> =>
    fetchData({
        url: draftUrl(campaignKey),
        method: FETCH_METHODS.PUT,
        bodyData: JSON.stringify(input),
        responseHandling,
    });

export const getServiceNoticeDraft = (campaignKey: string): Promise<ServiceNoticeDraft> =>
    fetchData({ url: draftUrl(campaignKey), method: FETCH_METHODS.GET, responseHandling });

export const getServiceNoticePreview = (
    campaignKey: string,
    variant: ServiceNoticeVariant,
    signal?: AbortSignal,
): Promise<ServiceNoticePreview> =>
    fetchData({
        url: `${draftUrl(campaignKey)}/preview?variant=${encodeURIComponent(variant)}`,
        method: FETCH_METHODS.GET,
        responseHandling,
        signal,
    });

export const dryRunServiceNotice = (campaignKey: string): Promise<ServiceNoticeDryRun> =>
    fetchData({ url: `${draftUrl(campaignKey)}/dry-run`, method: FETCH_METHODS.GET, responseHandling });

/**
 * The operator's explicit send decision. It repeats the counted number; the server refuses it if
 * the audience changed since. Never retried automatically.
 */
export const confirmServiceNotice = (
    campaignKey: string,
    expectedRecipients: number,
): Promise<ServiceNoticeConfirmed> =>
    fetchData({
        url: `${draftUrl(campaignKey)}/confirm`,
        method: FETCH_METHODS.POST,
        bodyData: JSON.stringify({ expectedRecipients }),
        responseHandling,
    });

/** Display fixed local copy, never a remote exception body or URL. */
export const serviceNoticeErrorKey = (error: unknown): string => {
    if (error instanceof Response) {
        if (error.status === 400) return 'serviceNotices.errors.invalid';
        if (error.status === 403) return 'serviceNotices.errors.forbidden';
        if (error.status === 404) return 'serviceNotices.errors.notFound';
        if (error.status === 409) return 'serviceNotices.errors.conflict';
    }
    return 'serviceNotices.errors.unavailable';
};
