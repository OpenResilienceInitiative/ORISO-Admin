import type { Meta, StoryObj } from '@storybook/react-vite';
import { DpiaTextEditor } from './index';

/**
 * Editor for the operator-specific free texts of the Datenschutz-Folgenabschätzung (DSFA).
 * A variant of the legal editor: same M3 shell, but the split button in the lower function bar
 * navigates the document's chapters instead of languages (Docs#80, living DPIA epic).
 */
const meta = {
    title: 'Dpia/DpiaTextEditor',
    component: DpiaTextEditor,
    parameters: { layout: 'padded' },
    args: { onSave: () => undefined },
} satisfies Meta<typeof DpiaTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const GOVERNANCE =
    '<h2>Governance</h2>' +
    '<p>Über den Datenschutz der Beratungsplattform entscheidet der Datenschutzausschuss des Trägers. ' +
    'Er tagt quartalsweise und ist beschlussfähig, sobald die Datenschutzbeauftragung und die ' +
    'IT-Leitung vertreten sind.</p>';

const ESCALATION =
    '<h2>Eskalationskette</h2>' +
    '<p>Ein erkannter Datenschutzvorfall wird unverzüglich an die Datenschutzbeauftragung gemeldet. ' +
    'Diese informiert innerhalb von vier Stunden die Geschäftsführung; die Meldung an die Aufsicht ' +
    'erfolgt innerhalb von 72 Stunden.</p>';

/** Nothing written yet: every chapter is empty and the placeholder states what belongs in it. */
export const Default: Story = {
    args: {},
};

/**
 * Chapters 4 and 8.11 are written and published, the rest is still empty. In the chapter
 * dropdown a filled chapter is marked with a bullet, so the gaps are visible at a glance.
 */
export const WithContent: Story = {
    args: {
        initialTexts: { governance: GOVERNANCE, escalationChain: ESCALATION },
        statusBySection: { governance: 'PUBLISHED', escalationChain: 'PUBLISHED' },
    },
};

/**
 * Draft state: the chapter carries text but was never published, so the status tag stays
 * "Entwurf" and the footer offers both "Entwurf bearbeiten" and publish.
 */
export const DraftState: Story = {
    args: {
        initialTexts: { governance: GOVERNANCE },
        statusBySection: { governance: 'DRAFT' },
    },
};

/**
 * Split-button navigation: the leading segment names the open chapter, the trailing caret opens
 * all eight free-text slots — the four proportionality stages of chapter 9 grouped under one
 * heading. Open the dropdown in the lower function bar to step through the document.
 *
 * Editing the text and then picking another chapter raises the unsaved-changes guard, which
 * offers save-and-switch, discard, or cancel. The guard is a modal on purpose: the editor shell
 * has a fixed height and an inline banner above the editor pushes the text area out of the card.
 */
export const SplitButtonNavigation: Story = {
    args: {
        defaultSectionId: 'proportionalityNecessity',
        initialTexts: {
            governance: GOVERNANCE,
            escalationChain: ESCALATION,
            proportionalityNecessity:
                '<p>Ein milderes, gleich wirksames Mittel steht nicht zur Verfügung: eine Beratung ohne ' +
                'pseudonyme Kontoführung würde die Schwelle für Ratsuchende messbar erhöhen.</p>',
        },
    },
};

/** Phone 390×844: the function bar wraps and the chapter split button stays reachable. */
export const MobileViewport: Story = {
    args: {
        initialTexts: { governance: GOVERNANCE },
    },
    parameters: {
        viewport: {
            options: {
                phone390: { name: 'Phone 390×844', styles: { width: '390px', height: '844px' } },
            },
        },
    },
    globals: { viewport: { value: 'phone390', isRotated: false } },
};
