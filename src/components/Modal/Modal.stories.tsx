import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReactComponent as ScheduleIcon } from '../../resources/img/svg/oriso/schedule_24px.svg';
import { Modal, DialogButton } from './index';

/**
 * Standard M3 basic dialog (Design-System M3_ORISO, node 60942-12062):
 * surface-container-high sheet, optional hero icon, centered headline-small
 * title, body-medium text, divider and right-aligned M3 text buttons.
 */
const meta = {
    title: 'Organisms/Modal',
    component: Modal,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Confirmation dialog: title/content/actions all resolved via i18n keys. */
export const Confirmation: Story = {
    args: {
        titleKey: 'slogan',
        contentKey: 'subSlogan',
        okLabelKey: 'save',
        cancelLabelKey: 'cancel',
        onConfirm: () => {},
        onClose: () => {},
    },
};

/** Full M3 anatomy: 32px hero icon above the centered title, divider, text buttons. */
export const WithHeroIcon: Story = {
    args: {
        titleKey: 'slogan',
        contentKey: 'subSlogan',
        okLabelKey: 'save',
        cancelLabelKey: 'cancel',
        icon: <ScheduleIcon />,
        onConfirm: () => {},
        onClose: () => {},
    },
};

/** Without divider (short informational dialogs). */
export const WithoutDivider: Story = {
    args: {
        titleKey: 'slogan',
        contentKey: 'subSlogan',
        okLabelKey: 'save',
        showDivider: false,
        onConfirm: () => {},
        onClose: () => {},
    },
};

export const WithCustomChildren: Story = {
    args: {
        titleKey: 'slogan',
        okLabelKey: 'save',
        cancelLabelKey: 'cancel',
        onConfirm: () => {},
        onClose: () => {},
        children: 'Beliebiger Formularinhalt lässt sich als children einsetzen.',
    },
};

/* ── Footer button rules (deterministic — defined here, not tuned per dialog) ──
 *
 * All dialog footers use the same `DialogButton` (flat M3 text button):
 *   • Colours   — the confirming/primary action is brand-coloured (`primary`);
 *                 every secondary action is neutral grey.
 *   • 1–2 actions — a single right-aligned ROW on every screen. Give the dialog
 *                   enough `width` for long labels so two buttons never wrap.
 *   • 3+ actions  — right-aligned row on desktop; on mobile (≤575px) they stack
 *                   full-width with centered labels.
 * Switch the toolbar viewport to mobile on `ThreeActions` to see the stacking.
 */

/** One action: single primary button, right-aligned. */
export const OneAction: Story = {
    args: {
        titleKey: 'slogan',
        contentKey: 'subSlogan',
        icon: <ScheduleIcon />,
        okLabelKey: 'save',
        onConfirm: () => {},
        onClose: () => {},
    },
};

/** Two actions: one row on all screens (secondary grey + primary coloured). */
export const TwoActions: Story = {
    args: {
        titleKey: 'slogan',
        contentKey: 'subSlogan',
        icon: <ScheduleIcon />,
        cancelLabelKey: 'cancel',
        okLabelKey: 'save',
        onConfirm: () => {},
        onClose: () => {},
    },
};

/** Three actions: row on desktop, stacked full-width on mobile (≤575px). */
export const ThreeActions: Story = {
    args: {
        titleKey: 'slogan',
        contentKey: 'subSlogan',
        icon: <ScheduleIcon />,
        width: 600,
        onClose: () => {},
        footer: (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
                <DialogButton>Verwerfen</DialogButton>
                <DialogButton>Entwurf speichern</DialogButton>
                <DialogButton primary>Veröffentlichen</DialogButton>
            </div>
        ),
    },
};
