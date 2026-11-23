import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { UseAppConfigProvider } from '../../context/useAppConfig';
import { PermissionsSettingsView } from '../Tenants/AppSettings/PermissionsSettings/PermissionsSettingsView';
import { DEFAULT_PERMISSION_SETTINGS } from '../Tenants/AppSettings/PermissionsSettings/permissionsSettingsUtils';
import type { ChatTypeCardKey } from '../Tenants/AppSettings/PermissionsSettings/types';
import type { ConversationType } from '../ConversationModules/conversationModule';
import type { AppearanceSettings } from '../ConversationTypeAppearance/appearance';
import { ConversationTypeSettingsDialog } from '../ConversationTypeAppearance/ConversationTypeSettingsDialog';
import { shippedJourneys, type Journey } from './journey';
import { JourneysDialog } from './JourneysDialog';
import { JourneyTileEntry } from './index';
import { JourneyConflictError, memoryJourneyStore, type JourneyStore } from './journeyStore';
import { useJourneysInTiles } from './JourneysInTiles';
import type { JourneyScope } from './useJourneyWorkspace';

const topics = [
    { id: 1, name: 'Schwangerschaft' },
    { id: 2, name: 'Sucht' },
    { id: 3, name: 'U25 – Suizidprävention' },
    { id: 4, name: 'Schulden' },
];

const TYPE_OF_TILE: Record<ChatTypeCardKey, ConversationType> = {
    oneOnOne: 'AGENCY_COUNSELLING',
    liveChat: 'LIVE_CHAT',
    group: 'SELF_HELP',
    groupInternal: 'INTERNAL_GROUP',
};

/** Funktionszugriff as it is today, with the way into the journeys on every conversation type's tile. */
const FunktionszugriffWithJourneys = () => {
    const [journeys, setJourneys] = useState<Journey[]>(() => shippedJourneys(topics));
    const [open, setOpen] = useState<ConversationType>();
    const [appearance, setAppearance] = useState<AppearanceSettings>({});
    const [editing, setEditing] = useState<ConversationType>();
    return (
        <>
            <PermissionsSettingsView
                tenantId="tenant-1"
                isLoading={false}
                excludeCardKeys={[]}
                formStateKey="story"
                restrictedFields={new Set<string>()}
                onToggleUpdate={fn()}
                initialValues={{ settings: { ...DEFAULT_PERMISSION_SETTINGS } }}
                renderJourneys={(cardKey) => (
                    <JourneyTileEntry
                        type={TYPE_OF_TILE[cardKey]}
                        journeys={journeys}
                        topics={topics}
                        onOpen={() => setOpen(TYPE_OF_TILE[cardKey])}
                        onEditAppearance={() => setEditing(TYPE_OF_TILE[cardKey])}
                    />
                )}
            />
            {open && (
                <JourneysDialog
                    key={open}
                    type={open}
                    journeys={journeys}
                    topics={topics}
                    onSave={(next) => {
                        setJourneys(next);
                        setOpen(undefined);
                    }}
                    onClose={() => setOpen(undefined)}
                />
            )}
            {editing && (
                <ConversationTypeSettingsDialog
                    type={editing}
                    settings={appearance}
                    onSave={(next) => {
                        setAppearance(next);
                        setEditing(undefined);
                    }}
                    onClose={() => setEditing(undefined)}
                />
            )}
        </>
    );
};

const meta = {
    title: 'Settings/Einstellungen/Funktionszugriff/Reisen',
    id: 'settings-funktionszugriff-journeys',
    component: FunktionszugriffWithJourneys,
    parameters: {
        layout: 'fullscreen',
        msw: { handlers: [http.get('*/service/users/case-handover/reason-policies', () => HttpResponse.json([]))] },
    },
    decorators: [
        (Story) => (
            <UseAppConfigProvider>
                <Story />
            </UseAppConfigProvider>
        ),
    ],
} satisfies Meta<typeof FunktionszugriffWithJourneys>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Every conversation type's tile shows its journeys and destinations. */
export const OnEveryTile: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByTestId('journeys-entry-AGENCY_COUNSELLING')).toHaveTextContent('4 Ziele');
        await expect(canvas.getByTestId('journeys-entry-INTERNAL_GROUP')).toHaveTextContent('1 Reise');
    },
};

/** The plane on the Mailberatung tile opens the journeys of Mailberatung. */
export const OpenedFromTheTile: Story = {
    play: async ({ canvasElement }) => {
        const entry = await within(canvasElement).findByTestId('journeys-entry-AGENCY_COUNSELLING');
        await userEvent.click(within(entry).getByRole('button', { name: 'Reisen bearbeiten' }));
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('journeys-dialog')).toBeInTheDocument();
        await expect(body.getByTestId('journey-standard-AGENCY_COUNSELLING-departure')).toHaveTextContent('6 Schritte');
    },
};

/** Funktionszugriff as the pages mount it: journeys loaded from and saved to a store (ORISO-Admin#1571). */
const MountedFunktionszugriff = ({ store, scope }: { store: JourneyStore; scope: JourneyScope }) => {
    const journeys = useJourneysInTiles(scope, { store, enabled: true });
    return (
        <>
            <PermissionsSettingsView
                tenantId="tenant-1"
                isLoading={false}
                excludeCardKeys={[]}
                formStateKey="story"
                restrictedFields={new Set<string>()}
                onToggleUpdate={fn()}
                initialValues={{ settings: { ...DEFAULT_PERMISSION_SETTINGS } }}
                renderJourneys={journeys.renderJourneys}
            />
            {journeys.dialog}
        </>
    );
};

const topicHandler = http.get('*/service/topic/', () =>
    HttpResponse.json(
        topics.map((topic) => ({ ...topic, description: '', internalIdentifier: null, status: 'ACTIVE' })),
    ),
);
const mountedParameters = {
    msw: {
        handlers: [
            http.get('*/service/users/case-handover/reason-policies', () => HttpResponse.json([])),
            topicHandler,
        ],
    },
};

/** Saving on the platform stores the journeys; the tile shows the stored state. */
export const SavesToTheStore: Story = {
    parameters: mountedParameters,
    render: () => <MountedFunktionszugriff store={memoryJourneyStore()} scope={{ level: 'platform' }} />,
    play: async ({ canvasElement }) => {
        const entry = await within(canvasElement).findByTestId('journeys-entry-AGENCY_COUNSELLING');
        await userEvent.click(within(entry).getByRole('button', { name: 'Reisen bearbeiten' }));
        const body = within(canvasElement.ownerDocument.body);
        await body.findByTestId('journeys-dialog');
        await userEvent.click(body.getByRole('button', { name: 'Speichern' }));
        await waitFor(() => expect(body.queryByTestId('journeys-dialog')).not.toBeInTheDocument());
    },
};

/** Another admin saved meanwhile: nothing is overwritten, the dialog says so and offers to reload. */
export const ConflictWhenSaving: Story = {
    parameters: mountedParameters,
    render: () => {
        // Every save finds a newer version: someone else was quicker.
        const quicker: JourneyStore = {
            ...memoryJourneyStore(),
            savePlatform: async () => {
                throw new JourneyConflictError(2);
            },
        };
        return <MountedFunktionszugriff store={quicker} scope={{ level: 'platform' }} />;
    },
    play: async ({ canvasElement }) => {
        const entry = await within(canvasElement).findByTestId('journeys-entry-AGENCY_COUNSELLING');
        await userEvent.click(within(entry).getByRole('button', { name: 'Reisen bearbeiten' }));
        const body = within(canvasElement.ownerDocument.body);
        await body.findByTestId('journeys-dialog');
        await userEvent.click(body.getByRole('button', { name: 'Speichern' }));
        const failure = await body.findByTestId('journeys-save-failure');
        await expect(failure).toHaveTextContent('Inzwischen hat jemand anderes gespeichert');
        await expect(within(failure).getByRole('button', { name: 'Neu laden' })).toBeInTheDocument();
    },
};

/** A Träger before the platform stored any journeys: shown, not editable, and said why. */
export const TraegerBeforeThePlatform: Story = {
    parameters: mountedParameters,
    render: () => <MountedFunktionszugriff store={memoryJourneyStore()} scope={{ level: 'tenant', tenantId: 't1' }} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const entry = await canvas.findByTestId('journeys-entry-AGENCY_COUNSELLING');
        await expect(within(entry).queryByRole('button', { name: 'Reisen bearbeiten' })).not.toBeInTheDocument();
        await expect(canvas.getAllByTestId('journeys-tile-state')[0]).toHaveTextContent('noch nicht gespeichert');
    },
};
