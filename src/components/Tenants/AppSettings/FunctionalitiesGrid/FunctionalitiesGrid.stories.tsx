import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export
import { expect, waitFor } from 'storybook/test';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { FunctionalitiesGrid } from './index';

/**
 * The Träger "Funktionalitäten" tab as production shows it: no email server tile (both callers hide it, the email
 * server has its own tab), so the remaining tiles sit in the raster, other functions two columns wide.
 */
const tenant = {
    id: 7,
    name: 'Träger Süd',
    settings: { extendedSettings: { isVideoCallAllowed: true }, featureGroupChatV2Enabled: true },
};

const meta = {
    title: 'Settings/Einstellungen/Funktionalitäten/FunctionalitiesGrid',
    id: 'organisms-appsettings-functionalitiesgrid',
    component: FunctionalitiesGrid,
    args: { tenantId: '7', hideSmtp: true },
    parameters: {
        layout: 'padded',
        msw: {
            handlers: [
                // OtherFunctionsSettings reads the Träger's policies (ORISO-TenantService#363).
                http.get('*/service/tenantadmin/:id/permission-policies', () =>
                    HttpResponse.json({ tenantId: 7, policies: {} }),
                ),
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
    // At least communication and other functions; the number of tiles is not fixed here.
    await waitFor(() => expect(items().length).toBeGreaterThanOrEqual(2));
    const page = canvasElement.ownerDocument.documentElement;
    await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth);
};

export const InTheRaster: Story = { play: noSidewaysScroll };

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
        await expect(tiles.length).toBeGreaterThanOrEqual(2);
        tiles.forEach((tile, index) => {
            expect(Math.abs(tile.width - hostWidth)).toBeLessThanOrEqual(1);
            // A tile that is as wide as the host but shifted sideways would still reach outside it.
            expect(Math.abs(tile.left - hostRect.left)).toBeLessThanOrEqual(1);
            expect(Math.abs(tile.right - hostRect.right)).toBeLessThanOrEqual(1);
            if (index > 0) expect(tile.top).toBeGreaterThanOrEqual(tiles[index - 1].bottom);
        });
    },
};
