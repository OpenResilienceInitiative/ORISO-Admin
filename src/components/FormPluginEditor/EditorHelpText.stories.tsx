import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { CloudSync } from '@mui/icons-material';
import { M3RichTextEditor } from './M3RichTextEditor';
import { EditorHelpText } from './EditorHelpText';
import { EditorHintSnackbar } from './EditorHintSnackbar';

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

/** Info icon + description, with the CTA tip below in bold (Figma 457-13255). */
export const DescriptionWithBoldHint: Story = {
    args: { text: description, hint: cta },
};

const PanelDemo = () => {
    const [hidden, setHidden] = useState(false);
    return (
        <M3RichTextEditor
            title="Auftragsdatenverarbeitungsvertrag"
            icon={CloudSync}
            value="<h1>Auftragsdatenverarbeitungsvertrag</h1><p>Diese Datenschutzerklärung beschreibt, wie wir personenbezogene Daten erheben, verarbeiten und speichern.</p>"
            versions={[{ id: '2026-07-13T10:22', label: '13. Jul 2026 – 10:22', content: '<p>Fassung Juli</p>' }]}
            versionLabel="Latest Version"
            helpSlot={<EditorHelpText text={description} hint={hidden ? cta : undefined} />}
            snackbarSlot={
                !hidden && (
                    <EditorHintSnackbar text={cta} onClose={() => setHidden(true)} onDismiss={() => setHidden(true)} />
                )
            }
            onPublish={() => undefined}
            onSaveDraft={() => undefined}
        />
    );
};

/**
 * The Data Agreements panel (Figma 1-34960): help text under the header, the
 * blocker CTA as a dismissible snackbar overlaying the editor. On viewports
 * below 600px the snackbar flows below the editor (12px lower corner radius)
 * and the maximize button is hidden.
 */
export const PanelWithBlockerSnackbar = {
    render: () => <PanelDemo />,
};
