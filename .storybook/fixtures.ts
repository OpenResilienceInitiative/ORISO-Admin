import { http, HttpResponse } from 'msw';

// This named preview identity is deliberately narrow. Any different tenant or
// API still needs its own story handler; negative HTTP states override these.
export const storybookTenantFixture = { id: 1, name: 'Demo-Mandant', settings: {}, licensing: {} };

export const createSharedStoryHandlers = () => [
    http.get('*/service/tenant/public/localhost', () => HttpResponse.json(storybookTenantFixture)),
    http.get('*/service/tenant/1', () => HttpResponse.json(storybookTenantFixture)),
];
