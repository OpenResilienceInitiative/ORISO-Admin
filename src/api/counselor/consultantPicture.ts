import { counselorEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export const consultantPictureUrl = (consultantId: string) => `${counselorEndpoint}/${consultantId}/picture`;

export type ConsultantPictureErrorReason =
    | 'PICTURE_INVALID_IMAGE'
    | 'PICTURE_TOO_LARGE'
    | 'PICTURE_UNSUPPORTED_TYPE'
    | 'PICTURE_REJECTED'
    | 'PICTURE_SCAN_UNAVAILABLE';

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
