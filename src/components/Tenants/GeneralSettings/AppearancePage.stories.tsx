import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { GeneralSettings } from './index';
import { TENANT_DATA_KEY } from '../../../hooks/useTenantData.hook';
import { baseTenantPublicEndpoint, tenantAdminEndpoint } from '../../../appConfig';

const tenant = {
    id: 1,
    name: 'Example organisation',
    subdomain: 'example',
    adminEmails: [],
    settings: { activeLanguages: ['de', 'en'] },
    licensing: {},
    content: { impressum: {}, privacy: {}, termsAndConditions: {}, claim: {} },
    theming: { assistantName: 'Carimat', assistantIcon: 'default', primaryColor: '#a5000a', logo: '', favicon: '' },
};

const Harness = () => {
    const [client] = useState(() => {
        const query = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
        query.setQueryData([TENANT_DATA_KEY, 'no-tenant-claim'], tenant);
        return query;
    });
    return (
        <QueryClientProvider client={client}>
            <GeneralSettings tenantId="1" section="appearance" />
        </QueryClientProvider>
    );
};

/**
 * The real Appearance tab with its data hooks answered by mock handlers, so a reviewer sees every
 * card in the deck exactly as an administrator does. Check it at Phone 390 and Desktop 1440.
 */
const meta = {
    title: 'Organisms/Pages/Tenants/AppearancePage',
    component: Harness,
    parameters: {
        layout: 'fullscreen',
        msw: {
            handlers: [
                http.get(`${baseTenantPublicEndpoint}/id/1`, () => HttpResponse.json(tenant)),
                http.get(`${tenantAdminEndpoint}/1`, () => HttpResponse.json(tenant)),
            ],
        },
    },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
