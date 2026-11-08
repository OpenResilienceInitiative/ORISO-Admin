import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { setupServer } from 'msw/node';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createInviteEmailPreviewHandler } from './inviteEmailPreviewHandlers';
import fixtures from './invitePreviewFixtures.json';
import { EmailKitPreview } from '../../components/PlaceholderTemplate/EmailKitPreview';
import { previewInviteEmailTemplateContent } from '../../api/accountInvites/accountInvites';

vi.mock('../../appConfig', async (original) => ({
    ...(await original<typeof import('../../appConfig')>()),
    inviteEmailTemplatesEndpoint: 'https://fixture.example/service/useradmin/invite-email-templates',
}));
vi.mock('../../api/auth/auth', () => ({ getAccessTokenForRequests: () => 'synthetic-story-token' }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_key: string, fallback: string) => fallback, i18n: { language: 'de' } }),
}));

const server = setupServer(createInviteEmailPreviewHandler());
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => cleanup());
afterAll(() => server.close());
const previewParams = (request: (typeof fixtures)[number]['request']) => ({
    ...request,
    kind: request.kind === 'TENANT_INVITE' ? request.kind : undefined,
});

describe('backend-generated unsaved invite fixtures at the real API/consumer seam', () => {
    it.each(fixtures)('returns the exact backend response for $id', async ({ request, response }) => {
        expect(await previewInviteEmailTemplateContent(previewParams(request))).toEqual(response);
    });
    it.each([
        { body: 'a different draft' },
        { kind: 'COUNSELLOR_INVITE' },
        { language: 'en' },
        { subject: 'unrecorded subject' },
    ])('rejects unsupported request fields: %j', async (change) => {
        const request = { ...fixtures[0].request, ...change };
        const response = await fetch('https://fixture.example/service/useradmin/invite-email-templates/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        expect(response.status).toBe(422);
        expect(await response.json()).toMatchObject({ reason: 'UNSUPPORTED_STORY_PREVIEW' });
    });
    it('keeps the unknown marker in the actual consumer iframe', async () => {
        const fixture = fixtures.find((entry) => entry.id === 'unknown')!;
        render(<EmailKitPreview {...previewParams(fixture.request)} previewLabel="Preview" />);
        const region = screen.getByRole('region', { name: 'Preview' });
        await waitFor(() => expect(region.querySelector('iframe')).toHaveAttribute('srcdoc', fixture.response.html));
        expect(fixture.response.html).toContain('{{unbekannterPlatzhalter}}');
        expect(fixture.response.html).toContain('Hallo Maren');
    });
    it('shows the actual backend default invitation for an empty draft', async () => {
        const fixture = fixtures.find((entry) => entry.id === 'empty')!;
        render(<EmailKitPreview {...previewParams(fixture.request)} previewLabel="Preview" />);
        const region = screen.getByRole('region', { name: 'Preview' });
        await waitFor(() => expect(region.querySelector('iframe')).toHaveAttribute('srcdoc', fixture.response.html));
        expect(screen.getByText('Ihre Einladung')).toBeVisible();
        expect(fixture.response.html).toContain('Hallo Maren Muster');
        expect(fixture.response.plainText).toContain('Sie wurden eingeladen');
    });
    it('shows a visible preview failure for an unrecorded draft', async () => {
        render(<EmailKitPreview subject="Unrecorded" body="No fixture" previewLabel="Preview" />);
        expect(await screen.findByRole('status')).toHaveTextContent('Preview could not be rendered.');
        expect(screen.queryByTitle('Preview')).not.toBeInTheDocument();
    });
});
