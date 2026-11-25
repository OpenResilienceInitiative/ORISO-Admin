import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export
import { expect, waitFor } from 'storybook/test';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { FunctionalitiesGrid } from './index';

/**
 * The Träger "Weitere" tab (formerly Funktionalitäten) as production shows it (ORISO-Admin#1577): one
 * full-width tile with the folding section "Themen und Statistik".
 */
const tenant = {
    id: 7,
    name: 'Träger Süd',
    legalName: 'Caritasverband Süd e.V.',
    contactEmail: 'beratung@caritas-sued.de',
    licensing: { allowedNumberOfUsers: 40 },
    settings: { featureTopicsEnabled: true, featureStatisticsEnabled: true },
};

const meta = {
    title: 'Settings/Einstellungen/Weitere/FunctionalitiesGrid',
    id: 'organisms-appsettings-functionalitiesgrid',
    component: FunctionalitiesGrid,
    args: { tenantId: '7' },
    parameters: {
        layout: 'padded',
        msw: {
            handlers: [
                http.get('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
                http.put('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
                http.get('*/service/tenant/public/*', () => HttpResponse.json({ id: 7, settings: {} })),
                http.get('*/service/tenant/:id', () => HttpResponse.json({ id: 7, settings: {} })),
            ],
        },
    },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin], 7);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof FunctionalitiesGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const PHONE_WIDTH = 390;

const noSidewaysScroll: NonNullable<Story['play']> = async ({ canvasElement }) => {
    const items = () => canvasElement.querySelectorAll('[data-admin-card-grid-item]');
    // The functionalities tile; the number of tiles is not fixed here.
    await waitFor(() => expect(items().length).toBeGreaterThanOrEqual(1));
    const page = canvasElement.ownerDocument.documentElement;
    await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth);
};

export const InTheRaster: Story = { play: noSidewaysScroll };

/**
 * The Träger page of a platform admin (Frank, 2026-11-20): licence and sender moved here from Stammdaten,
 * as a second tile with its own save.
 */
export const OnTheTraegerPage: Story = {
    args: { withLicenceAndSender: true },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin], 0);
            return withAdminProviders(Story);
        },
    ],
    play: async (context) => {
        const items = () => context.canvasElement.querySelectorAll('[data-admin-card-grid-item]');
        await waitFor(() => expect(items()).toHaveLength(2), { timeout: 8000 });
        await noSidewaysScroll(context);
    },
};

/**
 * The same page in a phone-wide host (the raster follows the width of its host, not of the window): one column,
 * every tile as wide as the host and below the one before, no sideways scrolling.
 */
export const Phone: Story = {
    decorators: [
        (Story) => (
            <div data-testid="phone-host" style={{ width: PHONE_WIDTH }}>
                <Story />
            </div>
        ),
    ],
    play: async (context) => {
        await noSidewaysScroll(context);
        const { canvasElement } = context;
        const host = canvasElement.querySelector<HTMLElement>('[data-testid="phone-host"]');
        const hostRect = host?.getBoundingClientRect() ?? new DOMRect();
        const hostWidth = hostRect.width;
        const tiles = [...canvasElement.querySelectorAll('[data-admin-card-grid-item]')].map((item) =>
            item.getBoundingClientRect(),
        );

        await expect(hostWidth).toBe(PHONE_WIDTH);
        await expect(tiles.length).toBeGreaterThanOrEqual(1);
        tiles.forEach((tile, index) => {
            expect(Math.abs(tile.width - hostWidth)).toBeLessThanOrEqual(1);
            // A tile that is as wide as the host but shifted sideways would still reach outside it.
            expect(Math.abs(tile.left - hostRect.left)).toBeLessThanOrEqual(1);
            expect(Math.abs(tile.right - hostRect.right)).toBeLessThanOrEqual(1);
            if (index > 0) expect(tile.top).toBeGreaterThanOrEqual(tiles[index - 1].bottom);
        });
    },
};
