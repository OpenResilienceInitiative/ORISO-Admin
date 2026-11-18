import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, fn, userEvent, within } from 'storybook/test';
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
    title: 'Settings/Einstellungen/Funktionszugriff/Journeys',
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
        await expect(canvas.getByTestId('journeys-entry-INTERNAL_GROUP')).toHaveTextContent('1 Journey');
    },
};

/** The plane on the Mailberatung tile opens the journeys of Mailberatung. */
export const OpenedFromTheTile: Story = {
    play: async ({ canvasElement }) => {
        const entry = await within(canvasElement).findByTestId('journeys-entry-AGENCY_COUNSELLING');
        await userEvent.click(within(entry).getByRole('button', { name: 'Journeys bearbeiten' }));
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('journeys-dialog')).toBeInTheDocument();
        await expect(body.getByTestId('journey-standard-AGENCY_COUNSELLING-departure')).toHaveTextContent('5 Schritte');
    },
};
