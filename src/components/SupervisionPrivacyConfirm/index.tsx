import { ReactElement, useCallback, useState } from 'react';
import { Modal } from '../Modal';

/**
 * Asks before supervision is switched on (OBP 2.1 #107): a supervisor reads the conversations, and
 * everyone in a chat sees her role, so supervision has to be named in the privacy policy
 * (Datenschutzerklärung) of the platform or Träger. Switching supervision off never asks.
 *
 * Pass `confirmEnable` to the field that switches supervision on and render `dialog` next to it.
 * The field calls `confirmEnable(proceed)` instead of changing; only "confirm" runs `proceed`, so
 * cancelling leaves supervision off.
 */
export const useSupervisionPrivacyConfirm = (): {
    confirmEnable: (proceed: () => void) => void;
    dialog: ReactElement | null;
} => {
    const [pending, setPending] = useState<(() => void) | null>(null);

    // A function in state must be wrapped, or React would call it as an updater.
    const confirmEnable = useCallback((proceed: () => void) => setPending(() => proceed), []);

    const dialog = pending ? (
        <Modal
            titleKey="supervision.privacyConfirm.title"
            contentKey="supervision.privacyConfirm.text"
            okLabelKey="supervision.privacyConfirm.confirm"
            cancelLabelKey="supervision.privacyConfirm.cancel"
            onConfirm={() => {
                pending();
                setPending(null);
            }}
            onClose={() => setPending(null)}
        />
    ) : null;

    return { confirmEnable, dialog };
};
