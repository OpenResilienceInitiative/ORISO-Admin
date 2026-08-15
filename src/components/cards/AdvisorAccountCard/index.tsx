import classNames from 'classnames';
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';
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
    /**
     * The invitee's email comes from the invite and is not editable in the
     * public onboarding wizard (#997).
     */
    emailReadOnly?: boolean;
    /**
     * Field-specific, already-translated errors (shared consultant credential
     * policy — see `utils/consultantCredentialRules`). When set, the field
     * renders in the M3 error state with the message as supporting text.
     */
    usernameError?: string;
    passwordError?: string;
    /** Admin-composer actions — the whole action row is omitted when neither is wired. */
    onBatchMode?: () => void;
    onSendInvitation?: () => void;
    /** Inline OTP action; omitted when 2FA runs as its own wizard step. */
    onLinkOtp?: () => void;
    onCancel?: () => void;
    onNext?: () => void;
    className?: string;
}

/**
 * Counsellor Setup Wizard — "Advisor Account Data" step (Figma 1-34789).
 * FloatingLabelInput (email / username / password) + an M3Button action row +
 * a full-width outlined OTP action, inside the shared Card skeleton. The
 * footer (Cancel/Next) only renders when the mobile step flow wires the
 * handlers; the desktop multi-column composition submits page-level instead.
 */
export const AdvisorAccountCard = ({
    value,
    onChange,
    emailReadOnly,
    usernameError,
    passwordError,
    onBatchMode,
    onSendInvitation,
    onLinkOtp,
    onCancel,
    onNext,
    className,
}: AdvisorAccountCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            className={classNames(styles.card, className)}
            headerIcon={<ShieldIcon />}
            titleKey="cards.advisorAccount.title"
            subTitle={t('cards.advisorAccount.subtitle')}
            footer={
                onCancel || onNext ? (
                    <>
                        {onCancel && (
                            <M3Button variant="text" onClick={onCancel}>
                                {t('cards.actions.back')}
                            </M3Button>
                        )}
                        {onNext && (
                            <M3Button variant="text" onClick={onNext}>
                                {t('cards.actions.next')}
                            </M3Button>
                        )}
                    </>
                ) : undefined
            }
        >
            <div className={styles.body}>
                <FloatingLabelInput
                    label={t('cards.advisorAccount.email')}
                    allowClear={!emailReadOnly}
                    readOnly={emailReadOnly}
                    disabled={emailReadOnly}
                    value={value.email}
                    onChange={(e) => onChange({ email: e.target.value })}
                />
                {(onBatchMode || onSendInvitation) && (
                    <div className={styles.actionRow}>
                        {onBatchMode && (
                            <M3Button variant="text" icon={<BatchIcon />} onClick={onBatchMode}>
                                {t('cards.advisorAccount.batchMode')}
                            </M3Button>
                        )}
                        {onSendInvitation && (
                            <M3Button variant="text" icon={<SendIcon />} onClick={onSendInvitation}>
                                {t('cards.advisorAccount.sendInvitation')}
                            </M3Button>
                        )}
                    </div>
                )}
                <FloatingLabelInput
                    label={t('cards.advisorAccount.username')}
                    error={usernameError !== undefined}
                    supportingText={usernameError ?? t('cards.advisorAccount.usernameHint')}
                    value={value.username}
                    onChange={(e) => onChange({ username: e.target.value })}
                />
                <FloatingLabelInput
                    label={t('cards.advisorAccount.password')}
                    component={Input.Password}
                    error={passwordError !== undefined}
                    supportingText={passwordError ?? t('cards.advisorAccount.passwordHint')}
                    value={value.password}
                    onChange={(e) => onChange({ password: e.target.value })}
                />
                {onLinkOtp && (
                    <M3Button variant="outlined" icon={<ShieldIcon />} block onClick={onLinkOtp}>
                        {t('cards.advisorAccount.linkOtp')}
                    </M3Button>
                )}
            </div>
        </Card>
    );
};
