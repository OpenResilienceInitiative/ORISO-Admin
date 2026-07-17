import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider, Form } from 'antd';
import FormPluginEditor from './FormPluginEditor';

type FormInitialValues = Record<string, unknown>;
type FormPluginEditorParameters = {
    formInitialValues?: FormInitialValues;
};
type FormPluginEditorStory = StoryObj<typeof meta> & {
    parameters?: StoryObj<typeof meta>['parameters'] & FormPluginEditorParameters;
};

const defaultFormInitialValues: FormInitialValues = {
    legalText:
        '<p>Willkommen bei <strong>ORISO</strong>.</p><p>Bitte beachten Sie unsere <em>Datenschutzhinweise</em>.</p>',
};

const getFormInitialValues = (parameters: FormPluginEditorParameters): FormInitialValues =>
    parameters.formInitialValues ?? defaultFormInitialValues;

// Renders the TipTap rich-text editor in isolation (toolbar + HTML content +
// placeholder insertion). Doubles as the React 19 smoke test for the editor.
const meta = {
    title: 'Organisms/FormPluginEditor',
    component: FormPluginEditor,
    parameters: { layout: 'padded' },
    decorators: [
        (Story, context) => (
            <Form style={{ maxWidth: 720 }} initialValues={getFormInitialValues(context.parameters)}>
                <Story />
            </Form>
        ),
    ],
} satisfies Meta<typeof FormPluginEditor>;

export default meta;
type Story = FormPluginEditorStory;

export const Default: Story = {
    args: {
        name: 'legalText',
        placeholder: 'Rechtstext eingeben …',
        itemProps: { label: 'Rechtstext' },
    },
};

export const WithPlaceholders: Story = {
    args: {
        name: 'legalText',
        placeholder: 'E-Mail-Vorlage eingeben …',
        placeholders: { tenantName: 'Träger-Name', date: 'Datum' },
        itemProps: { label: 'E-Mail-Vorlage' },
    },
};

export const Disabled: Story = {
    args: {
        name: 'legalText',
        placeholder: 'Rechtstext eingeben …',
        disabled: true,
        itemProps: { label: 'Rechtstext (schreibgeschützt)' },
    },
};

// Fresh empty Form (no initialValues) so the placeholder is visible.
export const Empty: Story = {
    args: {
        name: 'legalText',
        placeholder: 'Rechtstext eingeben …',
        itemProps: { label: 'Rechtstext' },
    },
    parameters: { formInitialValues: {} },
};

// --- Anchor navigation -------------------------------------------------------
// Long legal text: headings become anchors (persistent ids), shown as a
// horizontal chip row above the content. Editing: chips have an "x" that
// removes the anchor; selecting text opens a bubble menu to link it to an
// anchor. The heading select in the toolbar creates new anchor targets.

const longLegalHtml =
    '<h2>1. Geltungsbereich</h2>' +
    '<p>Diese Datenschutzerklärung informiert über die Verarbeitung personenbezogener Daten auf der Beratungsplattform. Sie gilt für alle Angebote des Trägers.</p>' +
    '<h2>2. Verantwortliche Stelle</h2>' +
    '<p>Verantwortlich für die Datenverarbeitung ist der jeweilige Träger der Beratungsstelle. Details entnehmen Sie bitte dem Impressum.</p>' +
    '<h2>3. Datenverarbeitung</h2>' +
    '<p>Wir verarbeiten Daten ausschließlich zur Durchführung der Online-Beratung.</p>' +
    '<h3>3.1 Registrierung</h3>' +
    '<p>Bei der Registrierung wird nur ein Benutzername und ein Passwort erhoben. Die Beratung kann anonym erfolgen.</p>' +
    '<h3>3.2 Beratungsverlauf</h3>' +
    '<p>Nachrichten werden verschlüsselt gespeichert und nach Abschluss der Beratung gemäß den Löschfristen entfernt.</p>' +
    '<h2>4. Ihre Rechte</h2>' +
    '<p>Sie haben das Recht auf Auskunft, Berichtigung und Löschung. Wenden Sie sich dazu an den <a href="#kontakt">Kontakt</a> am Ende dieser Erklärung.</p>' +
    '<h2 id="kontakt">Kontakt</h2>' +
    '<p>Bei Fragen zum Datenschutz erreichen Sie uns über die im Impressum genannten Kontaktdaten.</p>';

// Same text with all anchor ids already stamped — what a saved legal text
// looks like after it went through the editor once.
const longLegalHtmlWithIds = longLegalHtml
    .replace('<h2>1. Geltungsbereich</h2>', '<h2 id="1-geltungsbereich">1. Geltungsbereich</h2>')
    .replace('<h2>2. Verantwortliche Stelle</h2>', '<h2 id="2-verantwortliche-stelle">2. Verantwortliche Stelle</h2>')
    .replace('<h2>3. Datenverarbeitung</h2>', '<h2 id="3-datenverarbeitung">3. Datenverarbeitung</h2>')
    .replace('<h3>3.1 Registrierung</h3>', '<h3 id="3-1-registrierung">3.1 Registrierung</h3>')
    .replace('<h3>3.2 Beratungsverlauf</h3>', '<h3 id="3-2-beratungsverlauf">3.2 Beratungsverlauf</h3>')
    .replace('<h2>4. Ihre Rechte</h2>', '<h2 id="4-ihre-rechte">4. Ihre Rechte</h2>');

export const WithAnchors: Story = {
    args: {
        name: 'legalText',
        placeholder: 'Rechtstext eingeben …',
        itemProps: { label: 'Datenschutzerklärung' },
    },
    parameters: { formInitialValues: { legalText: longLegalHtml } },
};

// Narrow viewport: the anchor menu works as a horizontally scrollable tag row.
export const WithAnchorsMobile: Story = {
    args: {
        name: 'legalText',
        placeholder: 'Rechtstext eingeben …',
        itemProps: { label: 'Datenschutzerklärung' },
    },
    decorators: [
        (Story) => (
            <div style={{ width: 375 }}>
                <Story />
            </div>
        ),
    ],
    parameters: { formInitialValues: { legalText: longLegalHtml } },
};

// Read-only viewer (like the M3 editor's version look-back): no toolbar, chips without "x",
// the active anchor (clicked or scrolled to) shows a checkmark.
export const WithAnchorsReadOnly: Story = {
    args: {
        name: 'legalText',
        placeholder: 'Rechtstext eingeben …',
        itemProps: { label: 'Datenschutzerklärung (schreibgeschützt)' },
    },
    decorators: [
        (Story) => (
            <ConfigProvider componentDisabled>
                <Story />
            </ConfigProvider>
        ),
    ],
    parameters: { formInitialValues: { legalText: longLegalHtmlWithIds } },
};
