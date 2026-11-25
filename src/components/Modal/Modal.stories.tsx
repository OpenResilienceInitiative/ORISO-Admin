import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
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

export const TextSize: Story = {
    ...Confirmation,
    name: 'Sentence and Cancel follow the text size',
    play: async ({ canvasElement }) => {
        const doc = canvasElement.ownerDocument;
        const host = within(doc.body);
        const body = doc.querySelector('.ant-modal-body');
        const cancel = host.getByRole('button', { name: /cancel|abbrechen/i });
        if (!(body instanceof HTMLElement)) throw new Error('The dialog sentence is missing');

        const read = (node: HTMLElement) => Number.parseFloat(getComputedStyle(node).fontSize);
        doc.documentElement.style.setProperty('--admin-personal-text-scale', '1');
        const bodyAtOne = read(body);
        const cancelAtOne = read(cancel);

        doc.documentElement.style.setProperty('--admin-personal-text-scale', '2');
        await waitFor(() => {
            expect(read(body)).toBeCloseTo(bodyAtOne * 2, 0);
            expect(read(cancel)).toBeCloseTo(cancelAtOne * 2, 0);
        });

        const box = cancel.getBoundingClientRect();
        const text = doc.createRange();
        text.selectNodeContents(cancel);
        const textBox = text.getBoundingClientRect();
        expect(textBox.top).toBeGreaterThanOrEqual(box.top - 1);
        expect(textBox.bottom).toBeLessThanOrEqual(box.bottom + 1);
        expect(textBox.left).toBeGreaterThanOrEqual(box.left - 1);
        expect(textBox.right).toBeLessThanOrEqual(box.right + 1);
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

/**
 * Standard delete/confirm dialog (the shape every migrated antd `Modal.confirm`
 * and delete modal now uses): hero delete icon, grey cancel + brand-coloured
 * confirm.
 */
export const DeleteConfirmation: Story = {
    args: {
        titleKey: 'agency.modal.headline.delete',
        contentKey: 'agency.modal.text.delete',
        icon: <DeleteOutlineOutlinedIcon />,
        cancelLabelKey: 'btn.cancel.uppercase',
        okLabelKey: 'agency.modal.btn.ok.uppercase',
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
