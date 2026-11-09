import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line import/no-extraneous-dependencies -- story-only helper
import { http, HttpResponse } from 'msw';
import { baseTenantPublicEndpoint, tenantAdminEndpoint } from '../../../../appConfig';
import { TENANT_DATA_KEY } from '../../../../hooks/useTenantData.hook';
import { withSeededAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { CardGrid } from '../../../CardGrid';
import { ReadOnlyHintContext } from '../../../CardEditable/ReadOnlyHintContext';
import { PHONE_390 } from '../../../DpaLegalForm/dpaStoryText';

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

const svg = (body: string, size: number) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">${body}</svg>`,
    )}`;

/** Images an organisation has uploaded, drawn as plain shapes so the story needs no files. */
const brandImages = {
    logo: svg(
        '<circle cx="16" cy="16" r="14" fill="#a5000a"/><path d="M10 21V11h7a4 4 0 0 1 0 8h-7" fill="none" stroke="#fff" stroke-width="2.5"/>',
        512,
    ),
    favicon: svg('<rect width="32" height="32" rx="6" fill="#a5000a"/><circle cx="16" cy="16" r="6" fill="#fff"/>', 32),
    associationLogo: svg(
        '<rect x="3" y="3" width="26" height="26" rx="4" fill="none" stroke="#5b5656" stroke-width="3"/><path d="M9 22l7-12 7 12z" fill="#5b5656"/>',
        512,
    ),
};

/** An organisation that has uploaded its logo, favicon and association logo. */
export const brandedTenant = { ...tenant, theming: { ...tenant.theming, ...brandImages } };

/** Handlers and data every tile on the appearance tab reads, so its story needs no real backend. */
export const appearanceHandlersFor = (data: typeof tenant) => [
    http.get(`${baseTenantPublicEndpoint}/*`, () => HttpResponse.json(data)),
    http.get(`${tenantAdminEndpoint}/1`, () => HttpResponse.json(data)),
];
export const appearanceHandlers = appearanceHandlersFor(tenant);

export const withAppearanceTenant = (data: typeof tenant) => (Story: () => ReactElement) =>
    withSeededAdminProviders(Story, (client) => {
        client.setQueryData([TENANT_DATA_KEY, 'no-tenant-claim'], data);
    });
export const withAppearanceData = withAppearanceTenant(tenant);

/**
 * The tile as the raster places it, beside a taller neighbour, so unused space shows. A story
 * sets `parameters.rasterWidth` to see the raster at a phone's width (the gutter included).
 */
export const inTheRaster = (Story: () => ReactElement, span: 1 | 2 = 1, width?: number) =>
    width ? (
        <div style={{ width, maxWidth: '100%', boxSizing: 'border-box', padding: 16 }}>
            <CardGrid raster>
                <CardGrid.Item span={span}>
                    <Story />
                </CardGrid.Item>
            </CardGrid>
        </div>
    ) : (
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

/** A phone, 390 px wide: the raster in one column inside the page gutter. */
export const atPhoneWidth = {
    parameters: { ...PHONE_390.parameters, layout: 'fullscreen', rasterWidth: 390 },
    globals: PHONE_390.globals,
};

const PlatformReleaseHint = ({ children }: { children: ReactNode }) => {
    const { t } = useTranslation();
    return (
        <ReadOnlyHintContext.Provider value={t('settings.masterData.editable.readOnlyHint')}>
            {children}
        </ReadOnlyHintContext.Provider>
    );
};

/** As the appearance page renders the tile for an organisation admin the platform has not released it for. */
export const asLockedForOrganisationAdmin = (Story: () => ReactElement) => (
    <PlatformReleaseHint>
        <Story />
    </PlatformReleaseHint>
);
