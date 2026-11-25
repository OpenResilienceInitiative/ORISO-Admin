import { http, HttpResponse } from 'msw';

/** MSW: a consultant without a photo (404), for stories that render the consultant form. */
export const noConsultantPictureHandler = http.get(
    '*/service/useradmin/consultants/:id/picture',
    () => new HttpResponse(null, { status: 404 }),
);
