import classNames from 'classnames';
import { Input } from 'antd';
import { Card } from '../../Card';
import { FloatingLabelInput } from '../../FloatingLabelInput';
import { M3Button } from '../../M3Button';
import { ReactComponent as AddIcon } from '../../../resources/img/svg/add.svg';
import styles from './styles.module.scss';

const MailIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden width="40" height="40">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
);

export interface BatchInvite {
    email: string;
    salutation: string;
    firstName: string;
    lastName: string;
    emailText: string;
}

export interface BatchModeCardProps {
    value: BatchInvite;
    onChange: (patch: Partial<BatchInvite>) => void;
    onAnotherPerson?: () => void;
    onCancel?: () => void;
    onSendToAll?: () => void;
    className?: string;
}

/**
 * "Batch Mode" bulk-invite card (Figma 1-34790). FloatingLabelInput (email +
 * optional name fields + email-text textarea) + an "Another person" outlined
 * action, inside the shared Card skeleton.
 */
export const BatchModeCard = ({
    value,
    onChange,
    onAnotherPerson,
    onCancel,
    onSendToAll,
    className,
}: BatchModeCardProps) => (
    <Card
        className={classNames(styles.card, className)}
        headerIcon={<MailIcon />}
        titleKey="Batch Mode"
        subTitle="Use Batch Mode to invite multiple people at once. You can optionally include first and last names. Only add the body in the greeting text. We will automatically add the names and emails for each person."
        footer={
            <>
                <M3Button variant="text" onClick={onCancel}>
                    Cancel
                </M3Button>
                <M3Button variant="text" onClick={onSendToAll}>
                    Send to All
                </M3Button>
            </>
        }
    >
        <div className={styles.body}>
            <FloatingLabelInput
                label="Email"
                allowClear
                value={value.email}
                onChange={(e) => onChange({ email: e.target.value })}
            />
            <FloatingLabelInput
                label="Salutation (optional)"
                value={value.salutation}
                onChange={(e) => onChange({ salutation: e.target.value })}
            />
            <FloatingLabelInput
                label="First Name (optional)"
                value={value.firstName}
                onChange={(e) => onChange({ firstName: e.target.value })}
            />
            <FloatingLabelInput
                label="Last Name (optional)"
                value={value.lastName}
                onChange={(e) => onChange({ lastName: e.target.value })}
            />
            <M3Button variant="outlined" icon={<AddIcon />} className={styles.anotherButton} onClick={onAnotherPerson}>
                Another Person
            </M3Button>
            <FloatingLabelInput
                label="Email Text"
                component={Input.TextArea}
                value={value.emailText}
                onChange={(e) => onChange({ emailText: e.target.value })}
            />
        </div>
    </Card>
);
