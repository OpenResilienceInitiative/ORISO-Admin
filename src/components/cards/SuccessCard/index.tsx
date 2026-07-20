import classNames from 'classnames';
import { Input } from 'antd';
import { Card } from '../../Card';
import { FloatingLabelInput } from '../../FloatingLabelInput';
import { M3Button } from '../../M3Button';
import { ReactComponent as FaceIcon } from '../../../resources/img/svg/face_nod.svg';
import styles from './styles.module.scss';

export interface SuccessCardProps {
    notes: string;
    onNotesChange: (value: string) => void;
    onFinish?: () => void;
    className?: string;
}

/**
 * Counsellor Setup Wizard — "All done" final step (Figma 1-34805). Card skeleton
 * + a notes textarea + a single primary finish action.
 */
export const SuccessCard = ({ notes, onNotesChange, onFinish, className }: SuccessCardProps) => (
    <Card
        className={classNames(styles.card, className)}
        headerIcon={<FaceIcon />}
        titleKey="All done"
        subTitle="Thank you very much. Please write any notes or corrections, such as missing advisors, in the comments."
        footer={
            <M3Button variant="text" className={styles.finish} onClick={onFinish}>
                Finish registration
            </M3Button>
        }
    >
        <FloatingLabelInput
            label="Additional notes"
            component={Input.TextArea}
            supportingText="Visible only to providers and admins"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
        />
    </Card>
);
