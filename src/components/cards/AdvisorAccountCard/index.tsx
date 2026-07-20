import classNames from 'classnames';
import { Input } from 'antd';
import { Card } from '../../Card';
import { FloatingLabelInput } from '../../FloatingLabelInput';
import { M3Button } from '../../M3Button';
import { ReactComponent as ShieldIcon } from '../../../resources/img/svg/verified.svg';
import styles from './styles.module.scss';

const BatchIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden width="18" height="18">
        <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 20h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
);
const SendIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden width="18" height="18">
        <path d="M3 11l17-7-7 17-2.5-7.5L3 11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
);

export interface AdvisorAccount {
    email: string;
    username: string;
    password: string;
}

export interface AdvisorAccountCardProps {
    value: AdvisorAccount;
    onChange: (patch: Partial<AdvisorAccount>) => void;
    onBatchMode?: () => void;
    onSendInvitation?: () => void;
    onLinkOtp?: () => void;
    onCancel?: () => void;
    onNext?: () => void;
    className?: string;
}

/**
 * Counsellor Setup Wizard — "Advisor Account Data" step (Figma 1-34789).
 * FloatingLabelInput (email / username / password) + an M3Button action row +
 * a full-width outlined OTP action, inside the shared Card skeleton.
 */
export const AdvisorAccountCard = ({
    value,
    onChange,
    onBatchMode,
    onSendInvitation,
    onLinkOtp,
    onCancel,
    onNext,
    className,
}: AdvisorAccountCardProps) => (
    <Card
        className={classNames(styles.card, className)}
        headerIcon={<ShieldIcon />}
        titleKey="Advisor Account Data"
        subTitle="Choose whether you want to use only chat or also video calls and other features. Some options may be disabled by the provider or platform administrator."
        footer={
            <>
                <M3Button variant="text" onClick={onCancel}>
                    Cancel
                </M3Button>
                <M3Button variant="text" onClick={onNext}>
                    Next
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
            <div className={styles.actionRow}>
                <M3Button variant="text" icon={<BatchIcon />} onClick={onBatchMode}>
                    Batch Mode
                </M3Button>
                <M3Button variant="text" icon={<SendIcon />} onClick={onSendInvitation}>
                    Send Invitation
                </M3Button>
            </div>
            <FloatingLabelInput
                label="Username"
                supportingText="Letters and numbers only"
                value={value.username}
                onChange={(e) => onChange({ username: e.target.value })}
            />
            <FloatingLabelInput
                label="min. 16-character password *"
                component={Input.Password}
                supportingText="incl. min. 1 special character, 1 uppercase letter, 1 number"
                value={value.password}
                onChange={(e) => onChange({ password: e.target.value })}
            />
            <M3Button variant="outlined" icon={<ShieldIcon />} block onClick={onLinkOtp}>
                Link OTP App
            </M3Button>
        </div>
    </Card>
);
