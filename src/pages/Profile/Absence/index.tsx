import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/Card';
import { FieldGrid } from '../../../components/FieldGrid';
import { FloatingLabelInput } from '../../../components/FloatingLabelInput';
import { ToggleRow } from '../../../components/ToggleRow';
import { ReactComponent as ClockIcon } from '../../../resources/img/svg/clock-arrow-down.svg';
import styles from './styles.module.scss';

/**
 * Prepared, not wired: the absence card is built and shown greyed out with a "coming soon"
 * tag until the backend can pause assignments. Every control is disabled on purpose.
 */
export const Absence = () => {
    const { t } = useTranslation();

    return (
        <Card
            titleKey="profile.absence.title"
            subTitleKey="profile.absence.subtitle"
            headerIcon={<ClockIcon />}
            dataTestId="profile-absence-card"
            cardTitleChildren={<span className={styles.soon}>{t('profile.absence.soon')}</span>}
        >
            <div className={styles.body}>
                <ToggleRow label={t('profile.absence.toggle')} checked={false} switchDisabled />
                <FieldGrid>
                    <FloatingLabelInput label={t('profile.absence.from')} disabled />
                    <FloatingLabelInput label={t('profile.absence.until')} disabled />
                </FieldGrid>
                <FloatingLabelInput label={t('profile.absence.substitute')} disabled />
            </div>
        </Card>
    );
};
