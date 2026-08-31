import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import Tune from '@mui/icons-material/Tune';
import { TemplateSplitButton } from '../PlaceholderTemplate';
import { EditorHintSnackbar } from './EditorHintSnackbar';
import { M3RichTextEditor } from './M3RichTextEditor';
import { SplitDropdown } from './SplitDropdown';

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

// The owner's caret trap (2026-08-19): a document that ends with a heading
// left ~184px of empty editor surface in which EVERY click put the caret into
// the heading — typing produced giant heading text. Contract under test
// (Word's click-and-type): clicking the empty space below a final heading
// creates a body paragraph and the caret lands in it (trailingParagraph.ts).
// This play function runs against the real browser layout — jsdom has none.
export const CaretBelowHeadingLandsInBodyText: Story = {
    render: (args) => <ControlledEditor {...args} />,
    args: {
        title: 'Datenschutz',
        value: '<h1>Datenschutzerklärung</h1>',
        languages: [{ value: 'de', label: 'Deutsch' }],
        language: 'de',
    },
    play: async ({ canvasElement }) => {
        const editorNode = await waitFor(() => {
            const node = canvasElement.querySelector<HTMLElement>('.ProseMirror');
            expect(node).not.toBeNull();
            return node!;
        });

        // The guarantee paragraph must exist below the final heading.
        await waitFor(() => expect(editorNode.querySelector('h1 + p')).not.toBeNull());

        // Click into the dead space between the heading's bottom and the
        // editor surface's bottom (its min-height keeps that area open).
        // `caretRangeFromPoint` is the browser's OWN hit-testing — the same
        // resolution a native click performs. Before the fix it resolved
        // every point in this area into the heading (measured 2026-08-19).
        const heading = editorNode.querySelector('h1')!;
        const headingRect = heading.getBoundingClientRect();
        const surfaceRect = editorNode.getBoundingClientRect();
        const clientX = surfaceRect.left + 24;
        const clientY = headingRect.bottom + (surfaceRect.bottom - headingRect.bottom) / 2;
        const caretRange = document.caretRangeFromPoint(clientX, clientY);
        expect(caretRange).not.toBeNull();

        editorNode.focus();
        const selection = document.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(caretRange!);

        // The caret must sit in a body paragraph AFTER the heading, never in
        // the heading itself.
        await waitFor(() => {
            const anchor = document.getSelection()?.anchorNode;
            expect(anchor).toBeTruthy();
            const block = anchor instanceof Element ? anchor : anchor?.parentElement;
            expect(block?.closest('p')).toBeTruthy();
            expect(block?.closest('h1')).toBeFalsy();
        });

        // Typing there produces body text and leaves the heading untouched.
        document.execCommand('insertText', false, 'Absatztext.');
        await waitFor(() => {
            expect(editorNode.querySelector('h1 + p')?.textContent).toBe('Absatztext.');
            expect(editorNode.querySelector('h1')?.textContent).toBe('Datenschutzerklärung');
        });
    },
};

const ResponsiveHintEditor = (args: Parameters<typeof M3RichTextEditor>[0]) => {
    const [visible, setVisible] = useState(true);
    return (
        <ControlledEditor
            {...args}
            snackbarSlot={
                visible ? (
                    <EditorHintSnackbar
                        text="Bitte veröffentlichen Sie zuerst den Vertrag."
                        onClose={() => setVisible(false)}
                        onDismiss={() => setVisible(false)}
                    />
                ) : undefined
            }
        />
    );
};

// Browser-level regression coverage for the narrow layout: the floating blocker
// reserves scroll space, the chapter navigation remains available, and the first
// function-bar control starts inside the viewport.
export const ResponsiveHintAndFunctionBar: Story = {
    render: (args) => <ResponsiveHintEditor {...args} />,
    args: {
        title: 'Datenschutz',
        value: anchoredContent,
        languages: [
            { value: 'de', label: 'Deutsch' },
            { value: 'en', label: 'Englisch' },
        ],
        language: 'de',
    },
    decorators: [
        (Story) => (
            <div style={{ width: 375 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByRole('status')).toBeInTheDocument());

        const textbox = canvas.getByRole('textbox');
        let scrollContainer = textbox.parentElement;
        while (scrollContainer && window.getComputedStyle(scrollContainer).overflowY !== 'auto') {
            scrollContainer = scrollContainer.parentElement;
        }
        expect(scrollContainer).not.toBeNull();
        expect(parseFloat(window.getComputedStyle(scrollContainer!).paddingBottom)).toBeGreaterThan(0);
        expect(canvas.getByRole('navigation')).toBeVisible();

        const languageControl = canvas.getByTitle('Sprache wählen');
        expect(languageControl.getBoundingClientRect().left).toBeGreaterThanOrEqual(
            canvasElement.getBoundingClientRect().left,
        );

        await userEvent.click(canvas.getByRole('button', { name: 'Hinweis ausblenden' }));
        await waitFor(() => expect(canvas.queryByRole('status')).not.toBeInTheDocument());
    },
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
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByRole('navigation')).toBeInTheDocument());

        const chapterNav = canvas.getByRole('navigation');
        expect(window.getComputedStyle(chapterNav).paddingTop).toBe('16px');
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
        placeholder: 'Fügen Sie hier die Vertragsunterlagen ein.',
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

const dpaVersions = [
    {
        id: '2026-07-01T10:00',
        label: '1. Jul 2026 – 10:22 (aktuell)',
        content: '<h2>Vertragsunterlagen</h2><p>Fassung vom Juli 2026.</p>',
    },
    {
        id: '2026-05-02T09:00',
        label: '2. Mai 2026 – 09:00',
        content: '<h2>Vertragsunterlagen</h2><p>Ältere Fassung vom Mai 2026.</p>',
    },
    {
        id: '2026-01-15T14:30',
        label: '15. Jan 2026 – 14:30',
        content: '<h2>Vertragsunterlagen</h2><p>Erste Fassung vom Januar 2026.</p>',
    },
];

// #268: the version select lists saved versions; picking an older one shows it
// read-only with a restore-as-draft (copy) + back-to-current banner.
export const WithVersionSelect: Story = {
    render: (args) => {
        const ControlledWithVersions = (props: Parameters<typeof M3RichTextEditor>[0]) => {
            const [value, setValue] = useState(props.value ?? '');
            return (
                <M3RichTextEditor
                    {...props}
                    value={value}
                    onChange={setValue}
                    onRestoreVersion={(content) => setValue(content)}
                />
            );
        };
        return <ControlledWithVersions {...args} />;
    },
    args: {
        title: 'Auftragsdaten Verabeitungsvertrag',
        value: '<h2>Vertragsunterlagen</h2><p>Aktueller Entwurf.</p>',
        versions: dpaVersions,
        languages: [{ value: 'de', label: 'Deutsch' }],
        language: 'de',
    },
};

// Read-only card (agency view): versions are browsable but never restorable.
export const VersionSelectReadOnly: Story = {
    render: (args) => <ControlledEditor {...args} />,
    args: {
        title: 'Auftragsdaten Verabeitungsvertrag',
        value: '<h2>Vertragsunterlagen</h2><p>Veröffentlichte Fassung.</p>',
        versions: dpaVersions,
        readOnly: true,
        languages: [{ value: 'de', label: 'Deutsch' }],
        language: 'de',
    },
};

const consentTemplates = [
    { id: 1, name: 'Vorlage 1' },
    { id: 2, name: 'Vorlage 2' },
];

/**
 * The agency (Fachbereich) data-protection footer in full: language, consent
 * template, topic and version — the four-control bar of the owner's decision of
 * 2026-08-19. Framed at Mobile 390x844, where the bar has to scroll horizontally
 * WITHOUT showing a scrollbar.
 */
const AgencyFooterEditor = (args: Parameters<typeof M3RichTextEditor>[0]) => {
    const [value, setValue] = useState(args.value ?? '');
    const [templateId, setTemplateId] = useState<number | string>(2);
    return (
        <M3RichTextEditor
            {...args}
            value={value}
            onChange={setValue}
            consentSlot={
                <TemplateSplitButton
                    activeTemplateId={templateId}
                    disabled={args.readOnly}
                    templates={consentTemplates}
                    onSelectTemplate={setTemplateId}
                />
            }
            topicSlot={
                <SplitDropdown
                    disabled={args.readOnly}
                    icon={<Tune />}
                    label="Sucht"
                    title="Fachbereich wählen"
                    menu={{
                        selectable: true,
                        selectedKeys: ['sucht'],
                        items: [
                            { key: 'sucht', label: 'Sucht' },
                            { key: 'schulden', label: 'Schulden' },
                        ],
                    }}
                />
            }
        />
    );
};

export const AgencyFooterWithConsentTemplate: Story = {
    render: (args) => <AgencyFooterEditor {...args} />,
    args: {
        title: 'Datenschutzerklärung',
        value: '<h2>Datenschutzerklärung</h2><p>Aktueller Entwurf des Fachbereichs.</p>',
        languages: [
            { value: 'de', label: 'Deutsch' },
            { value: 'en', label: 'Englisch' },
        ],
        language: 'de',
        versions: dpaVersions,
        versionLabel: 'Aktueller Entwurf',
    },
    decorators: [
        (Story) => (
            <div style={{ width: 390, height: 844, overflow: 'hidden' }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const bar = await waitFor(() => canvas.getByTestId('m3-editor-function-bar'));

        // Left to right: language, consent template, topic, version.
        const positions = ['Sprache wählen', 'Vorlagenmenü öffnen', 'Fachbereich wählen', 'Versionsverlauf'].map(
            (name) => {
                const control = canvas.getByRole('button', { name });
                expect(bar).toContainElement(control);
                return Array.from(bar.children).findIndex((child) => child.contains(control));
            },
        );
        expect(positions).toEqual([...positions].sort((a, b) => a - b));

        // The bar scrolls instead of wrapping, and never shows a scrollbar: the
        // scroll track occupies no layout space at all.
        expect(bar.scrollWidth).toBeGreaterThan(bar.clientWidth);
        expect(bar.offsetHeight - bar.clientHeight).toBe(0);
        expect(window.getComputedStyle(bar).flexWrap).toBe('nowrap');
    },
};

// Read-only (no legal-text permission, or an archived version on screen): the
// consent chooser stays VISIBLE and goes inert — hiding it would also hide that
// this level offers templates at all.
export const AgencyFooterReadOnly: Story = {
    render: (args) => <AgencyFooterEditor {...args} />,
    args: {
        title: 'Datenschutzerklärung',
        value: '<h2>Datenschutzerklärung</h2><p>Veröffentlichte Fassung.</p>',
        readOnly: true,
        languages: [{ value: 'de', label: 'Deutsch' }],
        language: 'de',
        versions: dpaVersions,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const chooser = await waitFor(() => canvas.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        expect(chooser).toBeVisible();
        expect(chooser).toBeDisabled();
    },
};
