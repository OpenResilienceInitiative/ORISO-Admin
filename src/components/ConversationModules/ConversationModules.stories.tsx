import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, userEvent, within } from 'storybook/test';
import { prototypeFor, removeSection } from './conversationModule';
import { CARITAS_PLATFORM_DEFAULT, setTopicHidden, setTopicPostcode } from './registrationQuestionnaire';
import { ConversationModulesSettings } from './index';

/** Synthetic topics, as a Caritas install ships them. */
const topics = [
    { id: 1, name: 'Schwangerschaft' },
    { id: 2, name: 'Sucht' },
    { id: 3, name: 'U25 – Suizidprävention' },
    { id: 4, name: 'Schulden' },
];

let registrationSettings = { platformDefault: CARITAS_PLATFORM_DEFAULT, topics: {} };
registrationSettings = setTopicPostcode(registrationSettings, 2, false);
registrationSettings = setTopicHidden(registrationSettings, 3, true);

const registration = { settings: registrationSettings, topics };

const meta = {
    title: 'Settings/Einstellungen/Gesprächsmodule',
    id: 'settings-conversation-modules',
    component: ConversationModulesSettings,
    parameters: { layout: 'padded' },
    args: { level: 'platform', registration },
} satisfies Meta<typeof ConversationModulesSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Platform admin: one tile per conversation type, all still on the shipped prototype. */
export const Tiles: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByTestId('conversation-module-tile-AGENCY_COUNSELLING')).toBeInTheDocument();
        await expect(canvas.getByTestId('conversation-module-tile-INTERNAL_GROUP')).toBeInTheDocument();
    },
};

/** The dialog for Mailberatung, greeting tab: the section list with order and remove controls. */
export const GreetingDialog: Story = {
    args: { initiallyOpen: { type: 'AGENCY_COUNSELLING' } },
};

/** One section opened for editing: title, text and "starts collapsed". */
export const EditingAPanel: Story = {
    args: { initiallyOpen: { type: 'AGENCY_COUNSELLING' } },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const row = await body.findByTestId('module-section-whoReadsAlong');
        await userEvent.click(within(row).getByRole('button', { expanded: false }));
        await expect(within(row).getByRole('switch')).toBeInTheDocument();
    },
};

/** Closing questions: the follow-up survey with the question editor and the anonymity switch. */
export const ClosingQuestions: Story = {
    args: { initiallyOpen: { type: 'AGENCY_COUNSELLING', tab: 'closingQuestions' } },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const row = await body.findByTestId('module-section-survey');
        await userEvent.click(within(row).getByRole('button', { expanded: false }));
        await expect(await body.findByTestId('question-helped')).toBeInTheDocument();
    },
};

/** The emergency numbers were deleted: the editor is warned and may still save. */
export const SafetySectionRemoved: Story = {
    args: {
        modules: {
            AGENCY_COUNSELLING: removeSection(
                prototypeFor('AGENCY_COUNSELLING'),
                'AGENCY_COUNSELLING:emergencyNumbers',
            ),
        },
        initiallyOpen: { type: 'AGENCY_COUNSELLING' },
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('module-safety-warning')).toBeInTheDocument();
    },
};

/** Registration per topic (Mailberatung, platform level): postcode on/off and "link only" per topic. */
export const RegistrationPerTopic: Story = {
    args: { initiallyOpen: { type: 'AGENCY_COUNSELLING', tab: 'registration' } },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('registration-topic-2')).toBeInTheDocument();
    },
};

/** Träger level: Mailberatung inherits the platform's own version, no registration tab here. */
export const TraegerInheritsPlatform: Story = {
    args: {
        level: 'tenant',
        inherited: {
            AGENCY_COUNSELLING: {
                module: removeSection(prototypeFor('AGENCY_COUNSELLING'), 'AGENCY_COUNSELLING:responseTime'),
                level: 'platform',
            },
        },
    },
};

/** An empty internal group, opened: nothing set up, the four kinds to start from. */
export const EmptyInternalGroup: Story = {
    args: { initiallyOpen: { type: 'INTERNAL_GROUP' } },
};
