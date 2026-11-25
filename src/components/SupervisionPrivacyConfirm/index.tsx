import { ReactElement, useCallback, useState } from 'react';
import { Modal } from '../Modal';

/** The i18n keys of one data-protection confirmation. */
export type PrivacyConfirmKeys = {
    titleKey: string;
    contentKey: string;
    confirmKey: string;
    cancelKey: string;
    /** Interpolation values for title and text, e.g. the shared name of a team function. */
    options?: Record<string, unknown>;
};

/**
 * Asks before a setting that widens who reads a conversation is switched on. Switching it off never asks.
 *
 * Pass `confirmEnable` to the field that switches the setting on and render `dialog` next to it.
 * The field calls `confirmEnable(proceed)` instead of changing; only "confirm" runs `proceed`, so
 * cancelling leaves the setting off.
 */
export const usePrivacyConfirm = ({
    titleKey,
    contentKey,
    confirmKey,
    cancelKey,
    options,
}: PrivacyConfirmKeys): {
    confirmEnable: (proceed: () => void) => void;
    dialog: ReactElement | null;
} => {
    const [pending, setPending] = useState<(() => void) | null>(null);

    // A function in state must be wrapped, or React would call it as an updater.
    const confirmEnable = useCallback((proceed: () => void) => setPending(() => proceed), []);

    const dialog = pending ? (
        <Modal
            titleKey={titleKey}
            titleKeyOptions={options}
            contentKey={contentKey}
            contentKeyOptions={options}
            okLabelKey={confirmKey}
            cancelLabelKey={cancelKey}
            onConfirm={() => {
                pending();
                setPending(null);
            }}
            onClose={() => setPending(null)}
        />
    ) : null;

    return { confirmEnable, dialog };
};

/**
 * Supervision (OBP 2.1 #107): a supervisor reads the conversations, and everyone in a chat sees her role,
 * so supervision has to be named in the privacy policy (Datenschutzerklärung) of the platform or Träger.
 */
export const SUPERVISION_PRIVACY_CONFIRM: PrivacyConfirmKeys = {
    titleKey: 'supervision.privacyConfirm.title',
    contentKey: 'supervision.privacyConfirm.text',
    confirmKey: 'supervision.privacyConfirm.confirm',
    cancelKey: 'supervision.privacyConfirm.cancel',
};

/**
 * ORISO-Frontend#2491: the Team-Chat of a case stays open after the enquiry is accepted, so the team keeps
 * reading and writing in it — counsellors of the Beratungsstelle only, never the advice seeker.
 */
export const TEAM_CHAT_AFTER_ACCEPT_PRIVACY_CONFIRM: PrivacyConfirmKeys = {
    titleKey: 'tenants.permissions.teamChat.afterAccept.confirm.title',
    contentKey: 'tenants.permissions.teamChat.afterAccept.confirm.text',
    confirmKey: 'tenants.permissions.teamChat.afterAccept.confirm.confirm',
    cancelKey: 'tenants.permissions.teamChat.afterAccept.confirm.cancel',
};

export const useSupervisionPrivacyConfirm = () => usePrivacyConfirm(SUPERVISION_PRIVACY_CONFIRM);
