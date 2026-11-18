import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, userEvent, within } from 'storybook/test';
import {
    addStep,
    exampleInfoPanel,
    exampleSurveySteps,
    removeStep,
    shippedJourneys,
    standardJourney,
    updateStep,
    type Journey,
} from './journey';
import { JourneysSettings } from './index';
import { fakeSuggester, fakeTranslator } from './journeyTranslation';
import { TranslationApiError } from '../../api/tenant/translation';

/** Synthetic topics, as a Caritas install ships them. */
const topics = [
    { id: 1, name: 'Schwangerschaft' },
    { id: 2, name: 'Sucht' },
    { id: 3, name: 'U25 – Suizidprävention' },
    { id: 4, name: 'Schulden' },
    { id: 5, name: 'Erziehung' },
    { id: 6, name: 'Pflege' },
];

const [standardMail, ...otherTypes] = shippedJourneys(topics);

/** Journey #1: what registration does today, for every topic but U25. */
const standard: Journey = {
    ...standardMail,
    id: 'standard',
    routes: { registration: [1, 2, 4, 5, 6], links: [] },
};

/** Journey #2: a long debt flow for special cases, reached by its own link only. */
let debt: Journey = { ...standardJourney('AGENCY_COUNSELLING', 'debt', 2), name: 'Schulden ausführlich' };
debt = addStep(debt, 'departure', { kind: 'question' }, 'debt-situation');
debt = updateStep(debt, 'departure', 'debt-situation', {
    title: { de: 'Ihre Situation', en: 'Your situation' },
    profile: {
        about: 'Fragt, bei wie vielen Stellen Schulden bestehen und was gerade drängt.',
        goal: 'Dringlichkeit klären, bevor die erste Antwort geschrieben wird',
        author: 'Schuldnerberatung Köln-Mitte',
        audiences: ['adults'],
        keywords: {
            de: ['Schulden', 'Pfändung', 'Gläubiger', 'Mahnung'],
            en: ['debt', 'seizure', 'creditor'],
            tr: ['borç'],
        },
    },
    questions: [
        {
            id: 'creditors',
            type: 'single',
            display: 'dropdown',
            required: true,
            label: { de: 'Bei wie vielen Stellen haben Sie Schulden?', en: 'How many creditors do you have?' },
            options: [
                { id: 'one', label: { de: 'Bei einer', en: 'One' } },
                { id: 'few', label: { de: 'Bei zwei bis fünf', en: 'Two to five' } },
                { id: 'many', label: { de: 'Bei mehr als fünf', en: 'More than five' } },
            ],
            version: 1,
        },
        {
            id: 'urgent',
            type: 'multi',
            required: false,
            label: { de: 'Was drängt gerade?', en: 'What is urgent right now?' },
            options: [
                { id: 'rent', label: { de: 'Miete', en: 'Rent' } },
                { id: 'energy', label: { de: 'Strom oder Gas', en: 'Electricity or gas' } },
                { id: 'seizure', label: { de: 'Pfändung', en: 'Seizure' } },
            ],
            other: true,
            version: 1,
        },
    ],
});
// On board: its own info panel after the centre's greeting. Arrival: its own survey.
debt = {
    ...debt,
    phases: {
        ...debt.phases,
        flight: [...debt.phases.flight.slice(0, 2), exampleInfoPanel('debt'), ...debt.phases.flight.slice(2)],
        arrival: exampleSurveySteps('debt'),
    },
    routes: { registration: [], links: [{ id: 'debt-link', name: 'Schulden lang', topicIds: [4] }] },
};

/** Journey #3: U25 asks the age and no postcode; reached by the registration and by its own link. */
let u25: Journey = { ...standardJourney('AGENCY_COUNSELLING', 'u25', 3), name: 'U25' };
u25 = removeStep(u25, 'departure', 'u25:postcode');
u25 = addStep(u25, 'departure', { kind: 'addon', addon: 'age' }, 'u25-age', 'u25:topic');
// U25 in the registration AND behind its own link: one journey, two routes (Frank, 2026-11-18).
u25 = { ...u25, routes: { registration: [3], links: [{ id: 'u25-link', name: 'U25', topicIds: [3] }] } };

const liveChat: Journey = {
    ...otherTypes[0],
    routes: { registration: [], links: [{ id: 'live-link', name: 'Live-Chat Sucht', topicIds: [2] }] },
};

const journeys: Journey[] = [standard, debt, u25, liveChat, otherTypes[1], otherTypes[2]];

const meta = {
    title: 'Settings/Einstellungen/Reisen',
    id: 'settings-journeys',
    component: JourneysSettings,
    parameters: { layout: 'padded' },
    args: { topics, journeys, translator: fakeTranslator, suggester: fakeSuggester, canEditAppearance: true },
} satisfies Meta<typeof JourneysSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

const mail = (open: Record<string, unknown> = {}) => ({ type: 'AGENCY_COUNSELLING' as const, ...open });

/** The Journeys section: one tile per conversation type with its journeys and destinations. */
export const Tiles: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const entry = canvas.getByTestId('journeys-entry-AGENCY_COUNSELLING');
        await expect(entry).toHaveTextContent('3 Reisen');
        await expect(entry).toHaveTextContent('6 Ziele');
    },
};

/** A fresh installation: one shipped journey per conversation type, every topic in the registration. */
export const FreshInstallation: Story = {
    args: { journeys: undefined, initiallyOpen: mail() },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('journey-standard-AGENCY_COUNSELLING-destinations')).toHaveTextContent(
            '/registrierung6 Themen',
        );
    },
};

/** Mailberatung: three journeys, each with departure, flight, arrival and its destinations. */
export const JourneysOfMailberatung: Story = {
    args: { initiallyOpen: mail() },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('journey-standard-departure')).toHaveTextContent('6 Schritte');
        await expect(body.getByTestId('journey-u25-destinations')).toHaveTextContent('1 Link');
    },
};

/** Departure of the standard journey: topic, postcode, the two must steps, e-mail. */
export const Departure: Story = {
    args: { initiallyOpen: mail({ journeyId: 'standard', phase: 'departure' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        // "Choose a topic" is fixed at the top; no plus line before it.
        const topic = await body.findByTestId('journey-step-topic');
        await expect(within(topic).getByRole('img', { name: /Pflichtschritt/ })).toBeInTheDocument();
        await expect(body.queryByRole('button', { name: 'Schritt am Anfang einfügen' })).not.toBeInTheDocument();
        const consent = await body.findByTestId('journey-step-consent');
        // A must step has a lock instead of the drag handle.
        await expect(within(consent).getByRole('img', { name: /Pflichtschritt/ })).toBeInTheDocument();
        await expect(
            within(body.getByTestId('journey-step-postcode')).getByRole('button', { name: /verschieben/ }),
        ).toBeInTheDocument();
    },
};

/** A step moved with the keyboard: the e-mail goes up, the must steps stay where they are. */
export const StepMovedWithKeyboard: Story = {
    args: { initiallyOpen: mail({ journeyId: 'standard', phase: 'departure' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const email = await body.findByTestId('journey-step-email');
        within(email)
            .getByRole('button', { name: /verschieben/ })
            .focus();
        await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
        const order = within(body.getByRole('list', { name: /Schritte der Phase/ }))
            .getAllByRole('listitem')
            .map((item) => item.getAttribute('data-testid'));
        await expect(order).toEqual([
            'journey-step-topic',
            'journey-step-postcode',
            'journey-step-email',
            'journey-step-agency',
            'journey-step-username',
            'journey-step-consent',
        ]);
    },
};

/** "Add step": the kinds, and the core elements with the ones already used marked. */
export const AddStepCoreAlreadyUsed: Story = {
    args: { initiallyOpen: mail({ journeyId: 'u25', phase: 'departure', adding: true }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByTestId('journey-add-core'));
        // U25 dropped the postcode, so it can be added; the topic is in use.
        await expect(await body.findByTestId('journey-add-core-postcode')).toBeEnabled();
        await expect(body.getByTestId('journey-add-core-topic')).toBeDisabled();
    },
};

/** One step in its own dialog: the postcode, with its translation state. */
export const EditingAStep: Story = {
    args: {
        initiallyOpen: mail({
            journeyId: 'standard',
            phase: 'departure',
            stepId: 'standard-AGENCY_COUNSELLING:postcode',
        }),
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const dialog = await body.findByTestId('journey-step-dialog');
        await expect(within(dialog).getByDisplayValue('Postleitzahl')).toBeInTheDocument();
    },
};

/** "Translate with AI" on one step: the five missing languages are filled and marked as machine-made. */
export const TranslatedWithAi: Story = {
    args: { initiallyOpen: mail({ journeyId: 'standard', phase: 'departure' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const postcode = await body.findByTestId('journey-step-postcode');
        await userEvent.click(
            within(postcode).getByRole('button', { name: 'Fehlende Sprachen maschinell übersetzen' }),
        );
        await expect(within(postcode).getByTestId('step-translation')).toHaveTextContent(
            '2 Sprachen geprüft, 5 maschinell übersetzt, 0 fehlen',
        );
    },
};

/** Departure with a question step: the long debt flow. */
export const DepartureWithQuestions: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', phase: 'departure' }) },
};

/** The question step of the debt flow, opened. */
export const EditingQuestions: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', phase: 'departure', stepId: 'debt-situation' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('question-creditors')).toBeInTheDocument();
        // "Etwas anderes …" with free text, switched on for the second question.
        const urgent = body.getByTestId('question-urgent');
        await expect(within(urgent).getByRole('switch', { name: /Etwas anderes/ })).toBeChecked();
    },
};

/** U25 without a postcode: the person picks the centre from the topic's list; the age is asked. */
export const DepartureWithoutPostcode: Story = {
    args: { initiallyOpen: mail({ journeyId: 'u25', phase: 'departure' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('journey-step-age')).toBeInTheDocument();
        await expect(body.queryByTestId('journey-step-postcode')).not.toBeInTheDocument();
    },
};

/** Removing the postcode asks first, and says what changes for the person. */
export const RemovingThePostcode: Story = {
    args: { initiallyOpen: mail({ journeyId: 'standard', phase: 'departure' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const postcode = await body.findByTestId('journey-step-postcode');
        await userEvent.click(within(postcode).getByRole('button', { name: /Weitere Aktionen für Postleitzahl/ }));
        await userEvent.click(await body.findByRole('menuitem', { name: 'Löschen' }));
        await expect(await body.findByText(/Liste aller Beratungsstellen des Themas/)).toBeInTheDocument();
    },
};

/** On board in the standard journey: the enquiry, the centre's greeting, "suggest another service". */
export const OnBoard: Story = {
    args: { initiallyOpen: mail({ journeyId: 'standard', phase: 'flight' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('journey-step-enquiry')).toHaveTextContent('Schritt 1 · Nachricht');
        await expect(body.getByTestId('journey-step-agencyGreeting')).toBeInTheDocument();
        await expect(body.getByTestId('journey-step-suggestAlternative')).toHaveTextContent(
            'Von der Beratung ausgelöst',
        );
    },
};

/** "Suggest another service": sent only when the counsellor picks it in the conversation menu. */
export const SuggestAlternative: Story = {
    args: {
        initiallyOpen: mail({
            journeyId: 'standard',
            phase: 'flight',
            stepId: 'standard-AGENCY_COUNSELLING:suggestAlternative',
        }),
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const dialog = await body.findByTestId('journey-step-dialog');
        await expect(dialog).toHaveTextContent('Drei-Punkte-Menü');
    },
};

/** On board with an info panel of the journey's own after the centre's greeting (debt flow). */
export const OnBoardWithInfoPanel: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', phase: 'flight' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByText(/3 Aspekte/)).toBeInTheDocument();
    },
};

/** The info panel opened: one message with three aspects, the emergency numbers marked as safety content. */
export const EditingAnInfoPanel: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', phase: 'flight', stepId: 'debt:generalInfo' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('journey-aspect-emergencyNumbers')).toHaveTextContent('Sicherheit');
    },
};

/** Arrival in the standard journey: the centre's survey, sent on close or by the counsellor. */
export const Arrival: Story = {
    args: { initiallyOpen: mail({ journeyId: 'standard', phase: 'arrival' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('journey-step-agencySurvey')).toBeInTheDocument();
        await expect(body.getByRole('switch', { name: 'Anonym auswerten' })).toBeChecked();
    },
};

/** Arrival with a survey of the journey's own: a rating step and a question step (debt flow). */
export const ArrivalWithOwnSurvey: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', phase: 'arrival' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByText(/2 Bewertungen/)).toBeInTheDocument();
    },
};

/** A rating step opened: stars, and a scale from −5 to +5 with 0 labelled "normal". No number fields. */
export const EditingRatings: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', phase: 'arrival', stepId: 'debt:satisfaction' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const mood = await body.findByTestId('journey-rating-mood');
        await expect(within(mood).getByDisplayValue('normal')).toBeInTheDocument();
        await expect(within(mood).queryByRole('spinbutton')).not.toBeInTheDocument();
    },
};

/** Below the platform: the check-in comes from the platform; flight and arrival may be changed. */
export const TraegerLevel: Story = {
    args: { level: 'tenant', initiallyOpen: mail() },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const departure = await body.findByTestId('journey-standard-departure');
        await expect(departure.tagName).toBe('DIV');
        await expect(departure).toHaveTextContent('Kommt von der Plattform');
        await expect(body.getByTestId('journey-standard-flight').tagName).toBe('BUTTON');
    },
};

/** Funktionszugriff switched the e-mail building block off: the step stays and is skipped. */
export const EmailSwitchedOff: Story = {
    args: { blocked: ['email'], initiallyOpen: mail({ journeyId: 'standard', phase: 'departure' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('journey-step-email')).toHaveTextContent(
            'Im Funktionszugriff aus – wird übersprungen',
        );
    },
};

/** Destinations of the standard journey: the routes on top, then per topic its registration and links. */
export const Destinations: Story = {
    args: { initiallyOpen: mail({ journeyId: 'standard', destinations: true }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('journey-route-registration')).toHaveTextContent('5 Themen');
        await expect(body.getByTestId('journey-topic-1-registration')).toHaveAttribute('aria-pressed', 'true');
        // U25 is reached by a link of journey #3 only.
        await expect(body.getByTestId('journey-topic-3-registration')).toHaveAttribute('aria-pressed', 'false');
    },
};

/** "Create a link for Sucht" right in the topic's row: the link gets its name, path and topic. */
export const LinkForOneTopic: Story = {
    args: { initiallyOpen: mail({ journeyId: 'standard', destinations: true }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole('button', { name: 'Link für Sucht erstellen' }));
        const row = body.getByTestId('journey-topic-2');
        await expect(within(row).getByRole('button', { name: '/l/sucht' })).toBeInTheDocument();
        await expect(body.getByDisplayValue('Sucht')).toHaveFocus();
    },
};

/** A link-only journey takes over a topic of the registration: it moves over from journey #1. */
export const DestinationsTopicMovesHere: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', destinations: true }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const row = await body.findByTestId('journey-topic-4');
        await expect(row).toHaveTextContent('bei Reise #1');
        await userEvent.click(within(row).getByTestId('journey-topic-4-registration'));
        await expect(within(row).getByTestId('journey-topic-4-registration')).toHaveAttribute('aria-pressed', 'true');
        await expect(row).not.toHaveTextContent('Reise #1');
    },
};

/** A group has no departure: nobody registers into a group through a journey. */
export const GroupWithoutDeparture: Story = {
    args: { initiallyOpen: { type: 'SELF_HELP' } },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const card = await body.findByTestId('journey-standard-SELF_HELP');
        await expect(within(card).getByText('Nicht für Gruppen')).toBeInTheDocument();
        await expect(body.queryByTestId('journey-standard-SELF_HELP-departure')).not.toBeInTheDocument();
    },
};

const iconSvg = (path: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#a5000a"><path d="${path}"/></svg>`;
const envelope = 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm0 2v.4l8 5 8-5V7z';

/** The platform renamed Mailberatung and uploaded its own icon: every tile and dialog uses it. */
export const RenamedConversationType: Story = {
    args: {
        appearance: {
            AGENCY_COUNSELLING: {
                name: { de: 'Beratung per Mail', en: 'Counselling by mail' },
                icons: { outline400: iconSvg(envelope) },
            },
        },
    },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByTestId('journeys-tile-AGENCY_COUNSELLING')).toHaveTextContent(
            'Beratung per Mail',
        );
    },
};

/** Name and icon of Mailberatung: name per language, three SVG variants, preview. */
export const NameAndIcon: Story = {
    args: { initiallyOpen: { type: 'AGENCY_COUNSELLING', appearance: true } },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const dialog = await body.findByTestId('type-appearance-dialog');
        await userEvent.type(within(dialog).getByLabelText('Deutsch'), 'Beratung per Mail');
        const file = new File([iconSvg(envelope)], 'mail.svg', { type: 'image/svg+xml' });
        await userEvent.upload(body.getByTestId('type-icon-input-outline400'), file);
        await expect(await body.findByAltText('Outline, normal (400)')).toBeInTheDocument();
        await expect(body.getByTestId('type-appearance-preview')).toHaveTextContent('Beratung per Mail');
    },
};

/** An SVG with a script is refused before it is stored. */
export const UnsafeIconRefused: Story = {
    args: { initiallyOpen: { type: 'LIVE_CHAT', appearance: true } },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await body.findByTestId('type-appearance-dialog');
        const file = new File(['<svg onload="alert(1)"><path d="M0 0"/></svg>'], 'bad.svg', { type: 'image/svg+xml' });
        await userEvent.upload(body.getByTestId('type-icon-input-filled'), file);
        await expect(await body.findByText(/enthält Skripte/)).toBeInTheDocument();
    },
};

/** The language menu of one step: original, checked by hand, machine-translated, missing. */
export const LanguageMenu: Story = {
    args: { initiallyOpen: mail({ journeyId: 'standard', phase: 'departure' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const postcode = await body.findByTestId('journey-step-postcode');
        await userEvent.click(
            within(postcode).getByRole('button', { name: 'Fehlende Sprachen maschinell übersetzen' }),
        );
        await userEvent.click(within(postcode).getByRole('button', { name: /Sprachen geprüft/ }));
        const menu = await body.findByTestId('step-language-menu');
        await userEvent.click(within(menu).getByRole('button', { name: 'Französisch als von Hand geprüft markieren' }));
        await expect(within(menu).getAllByText('Von Hand geprüft')).toHaveLength(2);
        await expect(within(menu).getAllByText('Maschinell übersetzt')).toHaveLength(4);
    },
};

/** U25: one journey reached by the registration and by its own link. */
export const U25RegistrationAndLink: Story = {
    args: { initiallyOpen: mail({ journeyId: 'u25', destinations: true }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByTestId('journey-topic-3-registration')).toHaveAttribute('aria-pressed', 'true');
        await expect(
            within(body.getByTestId('journey-topic-3')).getByRole('button', { name: '/l/u25' }),
        ).toBeInTheDocument();
    },
};

/** A journey reached by one-topic links only may preselect the topic; the screen is then skipped. */
export const TopicPreselected: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', phase: 'departure' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const topic = await body.findByTestId('journey-step-topic');
        await userEvent.click(within(topic).getByRole('button', { name: /Weitere Aktionen für Thema wählen/ }));
        await userEvent.click(await body.findByRole('menuitem', { name: /Thema vorwählen/ }));
        await expect(topic).toHaveTextContent('Vorgewählt über den Link');
    },
};

/** A step in French: the original stands under each field; one field translated by machine, then reset. */
export const EditingInAnotherLanguage: Story = {
    args: {
        initiallyOpen: mail({
            journeyId: 'standard',
            phase: 'departure',
            stepId: 'standard-AGENCY_COUNSELLING:postcode',
            language: 'fr',
        }),
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const title = await body.findByTestId('step-field-title');
        await expect(title).toHaveTextContent('Postleitzahl');
        await userEvent.click(within(title).getByRole('button', { name: /maschinell übersetzen: Französisch/ }));
        await expect(within(title).getByDisplayValue('Postleitzahl (fr)')).toBeInTheDocument();
        await expect(within(title).getByRole('img', { name: 'Maschinell übersetzt' })).toBeInTheDocument();
        const description = body.getByTestId('step-field-description');
        await userEvent.click(within(description).getByRole('button', { name: /maschinell übersetzen: Französisch/ }));
    },
};

/** A step in English: the English texts show, the German original stands under them. */
export const EditingInEnglish: Story = {
    args: {
        initiallyOpen: mail({
            journeyId: 'standard',
            phase: 'departure',
            stepId: 'standard-AGENCY_COUNSELLING:postcode',
            language: 'en',
        }),
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const title = await body.findByTestId('step-field-title');
        await expect(within(title).getByDisplayValue('Postcode')).toBeInTheDocument();
        await userEvent.click(within(title).getByRole('button', { name: /Zurück zum Original/ }));
        await expect(within(title).queryByDisplayValue('Postcode')).not.toBeInTheDocument();
    },
};

/** Two questions on one screen, split so the person answers question by question. */
export const SplitIntoSteps: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', phase: 'departure', stepId: 'debt-situation' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole('button', { name: 'In 2 einzelne Schritte aufteilen' }));
        const phase = await body.findByTestId('journey-phase-departure');
        await expect(within(phase).getByText('Was drängt gerade?')).toBeInTheDocument();
    },
};

/** Answers and questions sorted with the arrows next to them. */
export const SortingAnswers: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', phase: 'departure', stepId: 'debt-situation' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const creditors = await body.findByTestId('question-creditors');
        await userEvent.click(within(creditors).getByRole('button', { name: 'Antwort 1 nach unten' }));
        const answers = within(creditors).getAllByRole('listitem');
        await expect(within(answers[0]).getByDisplayValue('Bei zwei bis fünf')).toBeInTheDocument();
        await expect(within(answers[1]).getByDisplayValue('Bei einer')).toBeInTheDocument();
        await expect(within(creditors).getByRole('button', { name: 'Frage 1 nach oben' })).toBeDisabled();
    },
};

/** The profile card in the step dialog: a summary; editing opens its own dialog. */
export const ProfileCard: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', phase: 'departure', stepId: 'debt-situation' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const about = await body.findByTestId('journey-step-about');
        await expect(about).toHaveTextContent('Schuldnerberatung Köln-Mitte');
        const dialog = body.getByTestId('journey-step-dialog');
        await expect(within(dialog).getByTestId('step-search')).toHaveAccessibleName(
            'Suche: 2 von 7 Sprachen abgedeckt',
        );
    },
};

/** Search terms per language: German typed, translated into all languages, Turkish suggestions taken. */
export const SearchTerms: Story = {
    args: { initiallyOpen: mail({ journeyId: 'debt', phase: 'departure', stepId: 'debt-situation' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const about = await body.findByTestId('journey-step-about');
        await userEvent.click(within(about).getByRole('button', { name: 'Steckbrief und Suchbegriffe' }));
        const dialog = await body.findByTestId('journey-profile-dialog');
        await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Eltern' }));
        await userEvent.type(
            within(dialog).getByRole('textbox', { name: 'Suchbegriff auf Deutsch' }),
            'Inkasso{Enter}',
        );
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Deutsche Begriffe in alle Sprachen übersetzen' }),
        );
        await userEvent.click(await within(dialog).findByRole('radio', { name: /^TR/ }));
        await expect(within(dialog).getByTestId('journey-keywords')).toHaveTextContent('Schulden (tr)');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Ähnliche Begriffe vorschlagen' }));
        await userEvent.click(await within(dialog).findByRole('button', { name: '„icra“ übernehmen' }));
        await expect(within(dialog).getByTestId('journey-keywords')).toHaveTextContent('icra');
        await userEvent.tab();
    },
};

/** The plus line between two steps inserts right there. */
export const InsertBetweenSteps: Story = {
    args: { initiallyOpen: mail({ journeyId: 'standard', phase: 'departure' }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole('button', { name: 'Schritt nach „Thema wählen“ einfügen' }));
        await userEvent.click(await body.findByTestId('journey-add-question'));
        const stepDialog = await body.findByTestId('journey-step-dialog');
        await userEvent.click(within(stepDialog).getByRole('button', { name: 'Übernehmen' }));
        const order = within(body.getByRole('list', { name: /Schritte der Phase/ }))
            .getAllByRole('listitem')
            .map((item) => item.getAttribute('data-testid'));
        await expect(order[1]).toMatch(/^journey-step-step-/);
    },
};

/** No API key stored: the button names the cause instead of failing silently. */
export const TranslationNotConfigured: Story = {
    args: {
        translator: () => Promise.reject(new TranslationApiError('TRANSLATION_NOT_CONFIGURED', 'openrouter')),
        initiallyOpen: mail({ journeyId: 'standard', phase: 'departure' }),
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const postcode = await body.findByTestId('journey-step-postcode');
        await userEvent.click(
            within(postcode).getByRole('button', { name: 'Fehlende Sprachen maschinell übersetzen' }),
        );
        await expect(await body.findByTestId('journey-translation-error')).toHaveTextContent('kein API-Schlüssel');
    },
};
