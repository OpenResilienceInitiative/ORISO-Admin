import { http, HttpResponse } from 'msw';
import fixtures from './invitePreviewFixtures.json';

const requestKey = (value: object) => JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));

// Exact recordings from the backend service/renderer, never a client renderer.
// Unsupported edits fail visibly in EmailKitPreview instead of showing another draft.
export const createInviteEmailPreviewHandler = () =>
    http.post('*/service/useradmin/invite-email-templates/preview', async ({ request }) => {
        const body: unknown = await request.json();
        const fixture =
            body !== null && typeof body === 'object' && !Array.isArray(body)
                ? fixtures.find((entry) => requestKey(entry.request) === requestKey(body))
                : undefined;
        if (!fixture) return HttpResponse.json({ reason: 'UNSUPPORTED_STORY_PREVIEW' }, { status: 422 });
        return HttpResponse.json(fixture.response);
    });
