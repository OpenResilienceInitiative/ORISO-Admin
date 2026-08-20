import type { Meta, StoryObj } from '@storybook/react-vite';
import type * as React from 'react';
import { useState } from 'react';
import { http, HttpResponse } from 'msw';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { CardDeck } from '../../../components/CardDeck';
import { GoLiveStatus, GoLiveCondition } from '../../../components/GoLiveStatus';
import { AgencyGeneralInformation } from './components/GeneralInformation';
import { RegistrationSettings } from './components/RegistrationSettings';
import { AgencySettings } from './components/AgencySettings';

/**
 * Review preview of the Beratungsstelle master-data rail as the page composes
 * it (Figma 1285-80497): one horizontal rail, scrolled sideways — first the
 * surface-less go-live position, then the wide form card (fields in up to three
 * columns) and the narrow, self-contained containers. Rendered without a
 * backend so the surface can be reviewed without a login.
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

const meta: Meta<typeof GoLiveStatus> = {
    title: 'Pages/Agency/GoLiveSurface',
    component: GoLiveStatus,
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1285-80497',
        },
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

type Story = StoryObj<typeof GoLiveStatus>;

const agencyChain = (met: number): GoLiveCondition[] =>
    [
        'Stammdaten ausfüllen',
        'Fachbereiche definieren',
        'Mindestens eine Person anlegen',
        'Datenschutzerklärung publizieren',
        'Impressum publizieren',
    ].map((label, index) => ({ key: `c${index}`, label, state: index < met ? 'met' : 'open' }));

/** The rail as the page builds it: bare go-live, wide form, narrow containers. */
const AgencyRail = ({ goLive }: { goLive: React.ReactNode }) => (
    <CardDeck ariaLabel="Beratungsstelle" previousLabel="Zurück" nextLabel="Weiter">
        <CardDeck.Item width="bare">{goLive}</CardDeck.Item>
        <CardDeck.Item width="wide">
            <AgencyGeneralInformation />
        </CardDeck.Item>
        <CardDeck.Item width="narrow">
            <RegistrationSettings />
        </CardDeck.Item>
        <CardDeck.Item width="narrow">
            <AgencySettings isEditMode={false} />
        </CardDeck.Item>
    </CardDeck>
);

/** Fresh Beratungsstelle: two steps done, switch still locked. */
export const AgencyInProgress: Story = {
    render: () => (
        <AgencyRail
            goLive={
                <GoLiveStatus
                    title="Go-Live-Status"
                    description="Diese Bedingungen braucht die Beratungsstelle, um in der Beratungsapp sichtbar zu sein. Sie werden automatisch geprüft."
                    conditions={agencyChain(2)}
                    switchControl={{
                        checked: false,
                        label: 'Beratungsstelle für die Beratungsapp aktivieren',
                        disabledHint:
                            'Aktivierbar, sobald alle Bedingungen erfüllt sind. Deaktivieren ist jederzeit möglich; bestehende Gespräche bleiben erhalten.',
                        onChange: () => {},
                    }}
                />
            }
        />
    ),
};

/** Everything met: the switch is live and can be toggled off at any time. */
export const AgencyReadyAndLive: Story = {
    render: function Render() {
        const [live, setLive] = useState(true);
        return (
            <AgencyRail
                goLive={
                    <GoLiveStatus
                        title="Go-Live-Status"
                        description="Diese Bedingungen braucht die Beratungsstelle, um in der Beratungsapp sichtbar zu sein. Sie werden automatisch geprüft."
                        conditions={agencyChain(5)}
                        switchControl={{
                            checked: live,
                            label: 'Beratungsstelle für die Beratungsapp aktivieren',
                            onChange: setLive,
                        }}
                    />
                }
            />
        );
    },
};

/** Träger surface: contract first, then create, then switch one agency live. */
export const TenantChain: Story = {
    render: () => (
        <GoLiveStatus
            title="Go-Live-Status"
            description="So geht der Träger live: Vertragsunterlagen unterschreiben, dann mindestens eine Beratungsstelle anlegen und live schalten."
            conditions={[
                { key: 'contract', label: 'Vertragsunterlagen unterschreiben (AVV)', state: 'met' },
                { key: 'agency', label: 'Mindestens eine Beratungsstelle anlegen', state: 'met' },
                { key: 'agencyLive', label: 'Mindestens eine Beratungsstelle live schalten', state: 'open' },
            ]}
        />
    ),
};
