import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { M3RichTextEditor } from './M3RichTextEditor';

// MUI Material 3 "Tip Tap Editor Module" (Figma Admin.ORISO 1:34903).
const meta = {
    title: 'Organisms/M3 Rich Text Editor',
    component: M3RichTextEditor,
    parameters: {
        layout: 'centered',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34903',
        },
    },
    // The red footer actions only render when handlers are wired — stub them so
    // the stories show the complete Figma design.
    args: {
        onPublish: () => undefined,
        onSaveDraft: () => undefined,
    },
} satisfies Meta<typeof M3RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const ControlledEditor = (args: Parameters<typeof M3RichTextEditor>[0]) => {
    const [value, setValue] = useState(args.value ?? '');
    const [language, setLanguage] = useState(args.language ?? 'de');
    return (
        <M3RichTextEditor
            {...args}
            value={value}
            onChange={setValue}
            language={language}
            onLanguageChange={setLanguage}
        />
    );
};

export const Imprint: Story = {
    render: (args) => <ControlledEditor {...args} />,
    args: {
        title: 'Impressum',
        placeholder: 'Fügen Sie hier Ihr Impressum ein.',
        value: '<p>Willkommen bei <strong>ORISO</strong>.</p><p>Bitte beachten Sie unsere <em>Hinweise</em>.</p>',
        languages: [
            { value: 'de', label: 'Deutsch' },
            { value: 'en', label: 'Englisch' },
            { value: 'fr', label: 'Französisch' },
        ],
        language: 'de',
        versionLabel: 'Latest Version',
    },
};

export const GDPR: Story = {
    render: (args) => <ControlledEditor {...args} />,
    args: {
        title: 'Datenschutz',
        placeholder: 'Fügen Sie hier die Datenschutzerklärung ein.',
        value: '',
        languages: [{ value: 'de', label: 'Deutsch' }],
        language: 'de',
    },
};

const anchoredContent =
    '<h2>Geltungsbereich</h2><p>Dieser Vertrag regelt die Auftragsverarbeitung. ' +
    'Siehe auch den Abschnitt <a href="#pflichten-des-auftragnehmers">Pflichten</a>.</p>' +
    '<h2>Pflichten des Auftragnehmers</h2><p>Weisungsbindung, Vertraulichkeit, TOMs.</p>' +
    '<h2>Unterauftragsverhältnisse</h2><p>Nur mit vorheriger Genehmigung.</p>';

// Standard anchor navigation: headings get persistent ids, the horizontal
// chip row above the editor jumps to them, selected text can be linked to an
// anchor via the bubble menu.
export const WithAnchorNavigation: Story = {
    render: (args) => <ControlledEditor {...args} />,
    args: {
        title: 'Auftragsdaten Verabeitungsvertrag',
        value: anchoredContent,
        languages: [{ value: 'de', label: 'Deutsch' }],
        language: 'de',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => {
            expect(canvas.getByRole('navigation')).toBeInTheDocument();
            expect(canvas.getAllByText('Geltungsbereich').length).toBeGreaterThan(0);
        });
    },
};

// Narrow container: the anchor chip row stays on ONE line and scrolls
// horizontally, same pattern as the toolbar and the segmented tabs.
export const AnchorRowNarrowOverflow: Story = {
    render: (args) => <ControlledEditor {...args} />,
    args: {
        title: 'Datenschutz',
        value: anchoredContent,
        languages: [{ value: 'de', label: 'Deutsch' }],
        language: 'de',
    },
    decorators: [
        (Story) => (
            <div style={{ width: 375 }}>
                <Story />
            </div>
        ),
    ],
};

// Read-only: chips have no "x", clicking one marks it with a checkmark, and
// in-text #anchor links scroll inside the card instead of navigating.
export const ReadOnlyWithAnchors: Story = {
    render: (args) => <ControlledEditor {...args} />,
    args: {
        title: 'Auftragsdaten Verabeitungsvertrag',
        value: anchoredContent,
        readOnly: true,
        languages: [{ value: 'de', label: 'Deutsch' }],
        language: 'de',
    },
};

// Opt-out state: no anchor row, headings stay untouched.
export const AnchorsDisabled: Story = {
    render: (args) => <ControlledEditor {...args} />,
    args: {
        title: 'Impressum',
        value: anchoredContent,
        enableAnchors: false,
        languages: [{ value: 'de', label: 'Deutsch' }],
        language: 'de',
    },
};

// Fullscreen mode as a real modal dialog (Figma 1007-27636): white 80% scrim
// with backdrop blur, centered card, round close button at the top right.
export const FullscreenDialog: Story = {
    render: (args) => <ControlledEditor {...args} />,
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1007-27636',
        },
    },
    args: {
        title: 'Auftragsdaten Verabeitungsvertrag',
        placeholder: 'Fügen Sie hier den Auftragsverarbeitungsvertrag ein.',
        value: '',
        languages: [{ value: 'de', label: 'Deutsch' }],
        language: 'de',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /Fenster maximieren/i }));

        // The antd Modal portals to document.body, outside the canvas element.
        const body = within(canvasElement.ownerDocument.body);
        await waitFor(() => {
            expect(body.getByRole('dialog')).toBeInTheDocument();
            expect(body.getByRole('button', { name: 'Vollbild schließen' })).toBeInTheDocument();
        });
    },
};
