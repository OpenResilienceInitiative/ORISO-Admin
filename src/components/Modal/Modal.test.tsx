import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '.';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const renderModal = (props: Partial<React.ComponentProps<typeof Modal>> = {}) => {
    const handlers = { onConfirm: vi.fn(), onClose: vi.fn(), onDismiss: vi.fn() };
    render(
        <Modal
            titleKey="title"
            contentKey="content"
            cancelLabelKey="no"
            okLabelKey="yes"
            onConfirm={handlers.onConfirm}
            onClose={handlers.onClose}
            onDismiss={handlers.onDismiss}
            {...props}
        />,
    );
    return handlers;
};

// rc-dialog listens for Escape on its wrapper, not on the document.
const pressEscape = () =>
    fireEvent.keyDown(document.querySelector('.ant-modal-wrap') as HTMLElement, { key: 'Escape', keyCode: 27 });

describe('Modal', () => {
    it('routes the confirm text button to onConfirm and the cancel text button to onClose', async () => {
        const handlers = renderModal();

        await userEvent.click(screen.getByRole('button', { name: 'yes' }));
        await userEvent.click(screen.getByRole('button', { name: 'no' }));

        expect(handlers.onConfirm).toHaveBeenCalledTimes(1);
        expect(handlers.onClose).toHaveBeenCalledTimes(1);
        expect(handlers.onDismiss).not.toHaveBeenCalled();
    });

    // #1066: a dialog whose two buttons are both real decisions ("Ja"/"Nein") must not let
    // Escape, the X or a click outside silently pick one of them.
    it('routes Escape to onDismiss, never to onClose', () => {
        const handlers = renderModal();

        pressEscape();

        expect(handlers.onDismiss).toHaveBeenCalledTimes(1);
        expect(handlers.onClose).not.toHaveBeenCalled();
        expect(handlers.onConfirm).not.toHaveBeenCalled();
    });

    it('routes the X to onDismiss, never to onClose', async () => {
        const handlers = renderModal();

        await userEvent.click(document.querySelector('.ant-modal-close') as HTMLElement);

        expect(handlers.onDismiss).toHaveBeenCalledTimes(1);
        expect(handlers.onClose).not.toHaveBeenCalled();
    });

    it('routes a click on the backdrop to onDismiss, never to onClose', () => {
        const handlers = renderModal();
        const wrap = document.querySelector('.ant-modal-wrap') as HTMLElement;

        fireEvent.mouseDown(wrap);
        fireEvent.mouseUp(wrap);
        fireEvent.click(wrap);

        expect(handlers.onDismiss).toHaveBeenCalledTimes(1);
        expect(handlers.onClose).not.toHaveBeenCalled();
    });

    it('falls back to onClose for dismiss gestures when no onDismiss is given', () => {
        const handlers = renderModal({ onDismiss: undefined });

        pressEscape();

        expect(handlers.onClose).toHaveBeenCalledTimes(1);
    });
});
