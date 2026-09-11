import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { CardGrid } from '../../../components/CardGrid';
import { AgencyGeneralInformation } from './components/GeneralInformation';
import { RegistrationSettings } from './components/RegistrationSettings';
import { AgencySettings } from './components/AgencySettings';

/**
 * #620: the agency create flow composes its three cards in the responsive
 * CardGrid (shared row width, wrap below the floor) instead of the fixed
 * 392px CardDeck. This story renders the real create composition so the
 * raster can be reviewed at desktop/tablet/mobile without a backend.
 */
const topics = [
    { id: 1, name: 'Allgemeine Sozialberatung', status: 'ACTIVE' },
    { id: 2, name: '[U25] Suizidprävention', status: 'ACTIVE' },
];

const consultants = {
    total: 1,
    embedded: [
        {
            embedded: {
                id: 'c1',
                firstname: 'Erika',
                lastname: 'Beispiel',
                email: 'erika@example.org',
                absent: false,
                agencies: [],
            },
        },
    ],
};

const meta: Meta<typeof CardGrid> = {
    title: 'Organisms/Agency/CreateFlowRaster',
    component: CardGrid,
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/topic*', () => HttpResponse.json(topics)),
                http.get('*/service/users/consultants/search*', () => HttpResponse.json(consultants)),
                http.get('*/service/agencyadmin/agencies*', () => HttpResponse.json({ embedded: [], total: 0 })),
            ],
        },
    },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <Form layout="vertical" size="large" labelAlign="left" labelWrap>
                    <Story />
                </Form>
            </ThemeProvider>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof CardGrid>;

export const Default: Story = {
    render: () => (
        <CardGrid minCardWidth={425} maxColumns={2}>
            <AgencyGeneralInformation />
            <RegistrationSettings />
            <AgencySettings isEditMode={false} />
        </CardGrid>
    ),
};
