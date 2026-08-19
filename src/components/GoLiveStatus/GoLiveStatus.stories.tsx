import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { GoLiveStatus } from './index';

/**
 * Go-live readiness section (concept 2026-08-19): a SECTION scoping the whole
 * area, never a card. Ordered, system-checked condition chain; the switch only
 * activates once every condition is met — deactivating is always possible.
 */
const meta: Meta<typeof GoLiveStatus> = {
    title: 'Organisms/GoLiveStatus',
    component: GoLiveStatus,
};

export default meta;

type Story = StoryObj<typeof GoLiveStatus>;

const agencyConditions = (states: Array<'met' | 'open' | 'violated'>) =>
    [
        'Stammdaten ausfüllen',
        'Fachbereiche definieren',
        'Mindestens eine Person anlegen',
        'Datenschutzerklärung publizieren',
        'Impressum publizieren',
    ].map((label, index) => ({ key: `c${index}`, label, state: states[index] ?? 'open' }));

export const ConditionsOpen: Story = {
    render: () => (
        <GoLiveStatus
            title="Go-Live-Status"
            description="Diese Bedingungen braucht die Beratungsstelle, um in der Beratungsapp sichtbar zu sein. Sie werden automatisch geprüft."
            conditions={agencyConditions(['met', 'met', 'open', 'open', 'open'])}
            switchControl={{
                checked: false,
                label: 'Beratungsstelle für die Beratungsapp aktivieren',
                disabledHint: 'Aktivierbar, sobald alle Bedingungen erfüllt sind.',
                onChange: () => {},
            }}
        />
    ),
};

export const ReadyToActivate: Story = {
    render: function Render() {
        const [checked, setChecked] = useState(false);
        return (
            <GoLiveStatus
                title="Go-Live-Status"
                description="Alle Bedingungen sind erfüllt – die Beratungsstelle kann live gehen."
                conditions={agencyConditions(['met', 'met', 'met', 'met', 'met'])}
                switchControl={{
                    checked,
                    label: 'Beratungsstelle für die Beratungsapp aktivieren',
                    onChange: setChecked,
                }}
            />
        );
    },
};

export const ViolatedWhileLive: Story = {
    render: () => (
        <GoLiveStatus
            title="Go-Live-Status"
            description="Eine Bedingung ist nicht mehr erfüllt – Deaktivieren bleibt jederzeit möglich."
            conditions={[
                ...agencyConditions(['met', 'met', 'met', 'met']).slice(0, 4),
                {
                    key: 'imprint',
                    label: 'Impressum publizieren',
                    state: 'violated' as const,
                    hint: 'Die publizierte Version wurde zurückgezogen.',
                },
            ]}
            switchControl={{
                checked: true,
                label: 'Beratungsstelle für die Beratungsapp aktivieren',
                onChange: () => {},
            }}
        />
    ),
};

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
