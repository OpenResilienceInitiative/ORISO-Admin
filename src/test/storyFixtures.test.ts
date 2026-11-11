// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vite-plus/test';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createSharedStoryHandlers } from '../../.storybook/fixtures';

const server = setupServer(...createSharedStoryHandlers());
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('shared named Storybook tenant fixture', () => {
    it('provides coherent public and saved tenant records for the localhost preview', async () => {
        const publicTenant = await fetch('https://storybook.test/service/tenant/public/localhost').then((response) =>
            response.json(),
        );
        const tenant = await fetch(`https://storybook.test/service/tenant/${publicTenant.id}`).then((response) =>
            response.json(),
        );
        expect(publicTenant).toMatchObject({ id: 1, name: 'Demo-Mandant', settings: {}, licensing: {} });
        expect(tenant).toEqual(publicTenant);
    });

    it('lets story-local handlers override the shared tenant fixture', async () => {
        server.use(
            http.get('*/service/tenant/public/localhost', () => HttpResponse.json({ id: 7, name: 'Own tenant' })),
        );
        const response = await fetch('https://storybook.test/service/tenant/public/localhost');
        expect(await response.json()).toEqual({ id: 7, name: 'Own tenant' });
    });
});
