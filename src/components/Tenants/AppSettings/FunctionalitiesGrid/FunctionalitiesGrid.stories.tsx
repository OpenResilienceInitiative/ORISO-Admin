import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export
import { expect, waitFor } from 'storybook/test';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { FunctionalitiesGrid } from './index';

/**
 * The Träger "Funktionalitäten" tab as production shows it: no email server tile (both callers hide it, the email
 * server has its own tab), so communication, other functions (two columns wide) and topics sit in the raster.
 */
const tenant = {
    id: 7,
    name: 'Träger Süd',
    settings: { extendedSettings: { isVideoCallAllowed: true }, featureGroupChatV2Enabled: true },
};

const meta = {
    title: 'Organisms/AppSettings/FunctionalitiesGrid',
    component: FunctionalitiesGrid,
    args: { tenantId: '7', hideSmtp: true },
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

const tilesStayInTheirHost: NonNullable<Story['play']> = async ({ canvasElement }) => {
    const items = () => canvasElement.querySelectorAll('[data-admin-card-grid-item]');
    await waitFor(() => expect(items()).toHaveLength(3));
    const page = canvasElement.ownerDocument.documentElement;
    await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth);
};

export const InTheRaster: Story = { play: tilesStayInTheirHost };

/** The same page at phone width: one column, no sideways scrolling. */
export const Phone: Story = {
    globals: { viewport: { value: 'phone', isRotated: false } },
    play: tilesStayInTheirHost,
};
