import classNames from 'classnames';
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../Card';
import { FloatingLabelInput } from '../../FloatingLabelInput';
import { M3Button } from '../../M3Button';
import { ReactComponent as FaceIcon } from '../../../resources/img/svg/face_nod.svg';
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
}

/**
 * Counsellor Setup Wizard — "All done" final step (Figma 1-34805). Card skeleton
 * + an optional notes textarea + a single primary finish action.
 */
export const SuccessCard = ({ notes, onNotesChange, onFinish, className }: SuccessCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            className={classNames(styles.card, className)}
            headerIcon={<FaceIcon />}
            titleKey="cards.success.title"
            subTitle={onNotesChange ? t('cards.success.subtitleWithNotes') : t('cards.success.subtitle')}
            footer={
                <M3Button variant="text" className={styles.finish} onClick={onFinish}>
                    {t('cards.success.finish')}
                </M3Button>
            }
        >
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
