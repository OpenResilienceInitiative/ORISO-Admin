import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { CardGrid } from '../../../CardGrid';
import { CommunicationSettings } from './index';

const tenant = { id: 7, name: 'Träger Süd', settings: { extendedSettings: { isVideoCallAllowed: true } } };

const meta = {
    title: 'Settings/Einstellungen/Funktionalitäten/CommunicationSettings',
    id: 'organisms-appsettings-communicationsettings',
    component: CommunicationSettings,
    args: { tenantId: '7' },
    parameters: {
        layout: 'padded',
        msw: {
            handlers: [
                http.get('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
                http.get('*/service/tenant/public/*', () => HttpResponse.json({ id: 7, settings: {} })),
                http.get('*/service/tenant/:id', () => HttpResponse.json({ id: 7, settings: {} })),
            ],
        },
    },
    decorators: [
        (Story) => (
            <CardGrid raster>
                <CardGrid.Item>
                    <Story />
                </CardGrid.Item>
            </CardGrid>
        ),
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin], 7);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof CommunicationSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InTheRaster: Story = {};
