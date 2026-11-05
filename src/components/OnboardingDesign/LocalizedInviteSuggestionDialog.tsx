import { useTranslation } from 'react-i18next';
import { InviteSuggestionDialog, type InviteSuggestion } from './InviteSuggestionDialog';

export interface LocalizedInviteSuggestionDialogProps {
    inviteeName: string;
    value: InviteSuggestion;
    onCancel: () => void;
    onConfirm: (value: InviteSuggestion) => void;
}

/** The invite composer's "Name und Icon vorschlagen" dialog with its text from i18n. */
export const LocalizedInviteSuggestionDialog = (props: LocalizedInviteSuggestionDialogProps) => {
    const { t } = useTranslation();
    return (
        <InviteSuggestionDialog
            {...props}
            title={t('links.composer.suggest.title', 'Name und Icon vorschlagen')}
            description={t(
                'links.composer.suggest.description',
                'Die Person sieht beides beim Anlegen des Kontos und kann es ändern. Einladung an',
            )}
            displayNameLabel={t('links.composer.suggest.displayName', 'Anzeigename')}
            displayNameHint={t(
                'links.composer.suggest.displayNameHint',
                'So sehen Ratsuchende die Person. Leer lassen, wenn sie ihn selbst wählen soll.',
            )}
            clearLabel={t('links.composer.suggest.clear', 'Vorschlag entfernen')}
            cancelLabel={t('links.composer.suggest.cancel', 'Abbrechen')}
            confirmLabel={t('links.composer.suggest.confirm', 'Übernehmen')}
        />
    );
};
