import { counselorEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { extractApiErrorReason } from '../../utils/extractApiErrorMessage';

export const consultantPictureUrl = (consultantId: string) =>
    `${counselorEndpoint}/${encodeURIComponent(consultantId)}/picture`;

export type ConsultantPictureErrorReason =
    | 'PICTURE_INVALID_IMAGE'
    | 'PICTURE_TOO_LARGE'
    | 'PICTURE_UNSUPPORTED_TYPE'
    | 'PICTURE_REJECTED'
    | 'PICTURE_SCAN_UNAVAILABLE';

/** Translation key per fixed UserService reason code (`PictureException`). */
const ERROR_KEY_BY_REASON: Record<ConsultantPictureErrorReason, string> = {
    PICTURE_TOO_LARGE: 'counselor.picture.error.tooLarge',
    PICTURE_UNSUPPORTED_TYPE: 'counselor.picture.error.unsupportedType',
    PICTURE_INVALID_IMAGE: 'counselor.picture.error.invalidImage',
    PICTURE_REJECTED: 'counselor.picture.error.rejected',
    // 503: the virus scanner is off or unreachable (fail-closed, ORISO-Helm#672). Not the photo's fault.
    PICTURE_SCAN_UNAVAILABLE: 'counselor.picture.error.scanUnavailable',
};

/** Reads the `{ reason }` body of a refused picture write and returns the message key to show. */
export const pictureWriteErrorKey = async (error: unknown): Promise<string> => {
    const reason = error instanceof Error ? error.message : await extractApiErrorReason(error);
    return ERROR_KEY_BY_REASON[reason as ConsultantPictureErrorReason] ?? 'counselor.picture.error.failed';
};

const pictureResponseHandling = [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT];

export const getConsultantPicture = async (consultantId: string, signal?: AbortSignal): Promise<Blob | null> => {
    try {
        return await fetchData({
            url: consultantPictureUrl(consultantId),
            method: FETCH_METHODS.GET,
            responseType: 'blob',
            signal,
            responseHandling: pictureResponseHandling,
        });
    } catch (error) {
        if (error instanceof Error && error.message === FETCH_ERRORS.NO_MATCH) {
            return null;
        }
        throw error;
    }
};

export const uploadConsultantPicture = (consultantId: string, picture: File): Promise<Response> =>
    fetchData({
        url: consultantPictureUrl(consultantId),
        method: FETCH_METHODS.PUT,
        bodyData: picture,
        headersData: { 'Content-Type': picture.type },
        responseHandling: pictureResponseHandling,
    });

export const removeConsultantPicture = (consultantId: string): Promise<Response> =>
    fetchData({
        url: consultantPictureUrl(consultantId),
        method: FETCH_METHODS.DELETE,
        responseHandling: pictureResponseHandling,
    });

export const consultantPictureVisibilityUrl = (consultantId: string) =>
    `${consultantPictureUrl(consultantId)}/visibility`;

/**
 * The publish decision. `true` keeps the photo internal to colleagues and admins, `false` also
 * shows it to advice seekers. No stored decision (or no photo) answers 404, which reads as the
 * safe default: internal only.
 */
export const getConsultantPictureVisibility = async (consultantId: string, signal?: AbortSignal): Promise<boolean> => {
    try {
        // fetchData already parses the JSON body of a successful GET.
        const body = await fetchData({
            url: consultantPictureVisibilityUrl(consultantId),
            method: FETCH_METHODS.GET,
            signal,
            responseHandling: pictureResponseHandling,
        });
        return body?.internalOnly !== false;
    } catch (error) {
        if (error instanceof Error && error.message === FETCH_ERRORS.NO_MATCH) {
            return true;
        }
        throw error;
    }
};

export const setConsultantPictureVisibility = (consultantId: string, internalOnly: boolean): Promise<Response> =>
    fetchData({
        url: consultantPictureVisibilityUrl(consultantId),
        method: FETCH_METHODS.PUT,
        bodyData: JSON.stringify({ internalOnly }),
        responseHandling: pictureResponseHandling,
    });
