import type { ReactElement } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies -- story-only helper
import { http, HttpResponse } from 'msw';
import { baseTenantPublicEndpoint, tenantAdminEndpoint } from '../../../../appConfig';
import { TENANT_DATA_KEY } from '../../../../hooks/useTenantData.hook';
import { withSeededAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { CardGrid } from '../../../CardGrid';

const tenant = {
    id: 1,
    name: 'Beispiel-Träger',
    subdomain: 'beispiel',
    adminEmails: [],
    settings: { activeLanguages: ['de', 'en'], extendedSettings: { languageFormal: true } },
    licensing: {},
    content: { claim: { de: 'Beratung, die ankommt' } },
    theming: { primaryColor: '#a5000a' },
};

/** Handlers and data every tile on the appearance tab reads, so its story needs no real backend. */
export const appearanceHandlers = [
    http.get(`${baseTenantPublicEndpoint}/*`, () => HttpResponse.json(tenant)),
    http.get(`${tenantAdminEndpoint}/1`, () => HttpResponse.json(tenant)),
];

export const withAppearanceData = (Story: () => ReactElement) =>
    withSeededAdminProviders(Story, (client) => {
        client.setQueryData([TENANT_DATA_KEY, 'no-tenant-claim'], tenant);
    });

/** The tile as the raster places it, beside a taller neighbour, so unused space shows. */
export const inTheRaster = (Story: () => ReactElement, span: 1 | 2 = 1) => (
    <CardGrid raster>
        <CardGrid.Item span={span}>
            <Story />
        </CardGrid.Item>
        {span === 1 && (
            <CardGrid.Item>
                <div style={{ height: 640 }} />
            </CardGrid.Item>
        )}
    </CardGrid>
);
