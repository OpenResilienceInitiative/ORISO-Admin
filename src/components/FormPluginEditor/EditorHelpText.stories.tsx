import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { M3RichTextEditor } from './M3RichTextEditor';
import { EditorHelpText } from './EditorHelpText';
import { EditorHintSnackbar } from './EditorHintSnackbar';
import { SplitDropdown } from './SplitDropdown';
import { DpaIcon, TopicIcon } from '../CustomIcons/LegalIcons';

const meta = {
    title: 'Organisms/M3RichTextEditor/HelpTexts',
    component: EditorHelpText,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof EditorHelpText>;

export default meta;
type Story = StoryObj<typeof meta>;

const description =
    'Fügen Sie hier den Datenverarbeitungsvertrag ein und drücken Sie Veröffentlichen, um den Vertrag für ' +
    'Träger zu veröffentlichen. Nur Träger, die den Vertrag unterschrieben haben, können auf der Plattform ' +
    'Ratsuchende beraten.';
const cta = 'Um Träger anzulegen, müssen Sie erst eine Datenauftragsverarbeitung publizieren.';

// Several headings so the anchor chip row overflows → prev/next nav appears.
const contractHtml =
    '<h1 id="vereinbarung-zur-auftragsverarbeitung">Auftragsdatenverarbeitungsvertrag</h1>' +
    '<p>Diese Datenschutzerklärung beschreibt, wie wir personenbezogene Daten erheben, verarbeiten und speichern. ' +
    'Wir erheben Daten ausschließlich für legitime Zwecke und verarbeiten diese gemäß der DSGVO.</p>' +
    '<h2 id="1-dokument-angabe">1. Dokument Angabe</h2><p>Welche Daten erheben wir? Name, E-Mail-Adresse, IP-Adresse.</p>' +
    '<h2 id="2-dokumentuebersicht">2. Dokumentübersicht und Anpassungshinweise</h2><p>Wie lange speichern wir Ihre Daten?</p>' +
    '<h2 id="3-weisungsbindung">3. Weisungsbindung</h2><p>Verarbeitung nur auf dokumentierte Weisung.</p>' +
    '<h2 id="4-vertraulichkeit">4. Vertraulichkeit</h2><p>Zur Vertraulichkeit verpflichtete Personen.</p>' +
    '<h2 id="5-toms">5. Technische und organisatorische Maßnahmen</h2><p>Art. 32 DSGVO.</p>';

const versions = [{ id: '2026-07-13T10:22', label: '13. Jul 2026 – 10:22', content: '<p>Fassung Juli</p>' }];

const topicSplit = (
    <SplitDropdown
        icon={<TopicIcon />}
        label="Alle Themen / Fachbereiche"
        title="Fachbereich wählen"
        menu={{
            selectable: true,
            selectedKeys: ['all'],
            items: [
                { key: 'all', label: 'Alle Themen / Fachbereiche' },
                { key: 'kids', label: 'Kinder und Jugendliche' },
                { key: 'debt', label: 'Schuldnerberatung' },
            ],
        }}
    />
);

/** Info icon + description, with the CTA tip below in bold (Figma 457-13255). */
export const DescriptionWithBoldHint: Story = {
    args: { text: description, hint: cta },
};

const PanelDemo = ({ readOnly }: { readOnly?: boolean }) => {
    const [hidden, setHidden] = useState(false);
    return (
        <M3RichTextEditor
            title="Auftragsdatenverarbeitungsvertrag"
            icon={DpaIcon}
            value={contractHtml}
            versions={versions}
            versionLabel="Latest Version"
            readOnly={readOnly}
            languages={[
                { value: 'de', label: 'Deutsch' },
                { value: 'en', label: 'Englisch' },
            ]}
            language="de"
            topicSlot={topicSplit}
            helpSlot={<EditorHelpText text={description} hint={hidden ? cta : undefined} />}
            snackbarSlot={
                !hidden &&
                !readOnly && (
                    <EditorHintSnackbar text={cta} onClose={() => setHidden(true)} onDismiss={() => setHidden(true)} />
                )
            }
            onPublish={() => undefined}
            onSaveDraft={() => undefined}
        />
    );
};

/**
 * The Data Agreements panel in write mode (Figma 1261-48667): maximize in the
 * toolbar, anchor chips inside the text surface with overflow nav arrows,
 * three split buttons in the lower function bar (language / topic / version),
 * blocker CTA as dismissible snackbar.
 */
export const PanelWriteMode = {
    render: () => <PanelDemo />,
};

/** Read mode (Figma 1261-51137): text without box, outline or padding; toolbar inert. */
export const PanelReadMode = {
    render: () => <PanelDemo readOnly />,
};
