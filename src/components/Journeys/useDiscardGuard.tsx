import { useState } from 'react';
import { Modal } from '../Modal';

/**
 * Escape, the close button and a click beside a dialog only close it right away while nothing was
 * changed. With changes they ask first, so one stray click cannot throw away an editing session.
 * "Abbrechen" stays an explicit discard and does not ask.
 *
 * Pass `onDismiss` to the dialog's Modal and render `confirm` next to it.
 */
export const useDiscardGuard = <T,>(draft: T, initial: T, onClose: () => void) => {
    const [asking, setAsking] = useState(false);
    const dirty = draft !== initial && JSON.stringify(draft) !== JSON.stringify(initial);
    const onDismiss = () => (dirty ? setAsking(true) : onClose());
    const confirm = asking ? (
        <Modal
            titleKey="journeys.discard.title"
            contentKey="journeys.discard.text"
            okLabelKey="journeys.discard.discard"
            cancelLabelKey="journeys.discard.keep"
            zIndex={1500}
            wrapperTestId="journey-discard"
            onConfirm={() => {
                setAsking(false);
                onClose();
            }}
            onClose={() => setAsking(false)}
        />
    ) : null;
    return { dirty, onDismiss, confirm };
};
