import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useTranslation } from 'react-i18next';
import type { ContactPair } from '../../types/contactPerson';
import { personLine } from './contactPersonModel';
import styles from './styles.module.scss';

/**
 * Shown while a Beratungsstelle names no own contact person (ORISO-Admin#1534):
 * which Träger default applies, or that counsellors see the centre's admins.
 */
export const TraegerDefaultHint = ({ traegerDefault }: { traegerDefault?: ContactPair | null }) => {
    const { t } = useTranslation();
    const contact = traegerDefault?.contact;

    if (!contact) {
        return (
            <p className={styles.hint} data-tone="warning" data-testid="contact-person-no-default">
                <WarningAmberOutlinedIcon aria-hidden />
                <span>{t('agency.edit.contactPerson.noDefault')}</span>
            </p>
        );
    }

    return (
        <p className={styles.hint} data-testid="contact-person-traeger-default">
            <InfoOutlinedIcon aria-hidden />
            <span>
                <span className={styles.hintLabel}>{t('agency.edit.contactPerson.traegerDefault')}</span>{' '}
                {personLine(contact)}
                {traegerDefault?.deputy && (
                    <>
                        {' · '}
                        {t('contactPerson.field.deputy')}: {personLine(traegerDefault.deputy)}
                    </>
                )}
                <span className={styles.chip}>{t('agency.edit.contactPerson.inherited')}</span>
            </span>
        </p>
    );
};
