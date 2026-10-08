import classNames from 'classnames';
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';
import LoginRounded from '@mui/icons-material/LoginRounded';
import { Card } from '../../Card';
import { FloatingLabelInput } from '../../FloatingLabelInput';
import { M3Button } from '../../M3Button';
import VerifiedIcon from '../../CustomIcons/Verified';
import { RegistrationGuide, type RegistrationAudience } from './RegistrationGuide';
import styles from './styles.module.scss';

export interface SuccessCardProps {
    /**
     * Notes textarea — only rendered when BOTH `notes` and `onNotesChange` are
     * wired. The public onboarding wizard (#997) omits it deliberately: no
     * backend channel exists for free-text notes yet (design review gap).
     */
    notes?: string;
    onNotesChange?: (value: string) => void;
    onFinish?: () => void;
    className?: string;
    titleKey?: string;
    subtitleKey?: string;
    finishKey?: string;
    /** Public guidance matches the invitation role; it never changes access rights. */
    audience?: RegistrationAudience;
}

/**
 * Public registration completion: direct sign-in followed by guidance that can
 * be read before authentication. The caller owns the login destination.
 */
export const SuccessCard = ({
    notes,
    onNotesChange,
    onFinish,
    className,
    titleKey,
    subtitleKey,
    finishKey,
    audience = 'counsellor',
}: SuccessCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            className={classNames(styles.card, className)}
            headerIcon={<VerifiedIcon data-testid="registration-success-icon" aria-hidden />}
            titleKey={titleKey ?? 'cards.success.title'}
            subTitle={t(subtitleKey ?? (onNotesChange ? 'cards.success.subtitleWithNotes' : 'cards.success.subtitle'))}
        >
            <div className={styles.actions}>
                <M3Button variant="filled" icon={<LoginRounded />} className={styles.finish} onClick={onFinish}>
                    {t(finishKey ?? 'cards.success.finish')}
                </M3Button>
                <p className={classNames('m3-body-medium', styles.later)}>{t('registrationGuide.later')}</p>
            </div>
            <RegistrationGuide audience={audience} />
            {onNotesChange ? (
                <FloatingLabelInput
                    label={t('cards.success.notes')}
                    component={Input.TextArea}
                    supportingText={t('cards.success.notesHint')}
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                />
            ) : (
                ''
            )}
        </Card>
    );
};
