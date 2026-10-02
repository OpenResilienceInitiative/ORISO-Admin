import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutlined';

/**
 * Client-side wait between two code mails. Keycloak enforces its own cooldown
 * once ORISO-UserService#1338 slice 1 ships and then sends the remaining
 * seconds with the challenge; until then this is the only brake.
 */
export const EMAIL_CODE_RESEND_COOLDOWN_SECONDS = 30;

/** Anything beyond an hour is not a cooldown we could have configured. */
const MAX_RESEND_WAIT_SECONDS = 3600;

/** The optional `resendAvailableInSeconds` of the challenge, if usable. */
export const readResendWait = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_RESEND_WAIT_SECONDS
        ? Math.ceil(value)
        : undefined;

/** 27 -> "0:27", 75 -> "1:15". */
export const formatResendCountdown = (seconds: number): string =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export type EmailCodeResendResult =
    | { kind: 'sent'; resendAvailableInSeconds?: number }
    | { kind: 'tooMany' }
    | { kind: 'failed' }
    /** Nothing to announce, e.g. the sign-in went through. */
    | { kind: 'none' };

type Notice = 'sent' | 'failed' | 'tooMany' | null;

interface LoginEmailCodeResendProps {
    /** Asks for a new code; resolves once Keycloak has answered. */
    onResend: () => Promise<EmailCodeResendResult>;
    /** Wait before the first resend; a code was mailed a moment ago. */
    initialCooldownSeconds?: number;
}

/**
 * "Send new code" below the code field of the sign-in form. Never claims
 * "sent" before Keycloak has answered with the e-mail challenge.
 */
export const LoginEmailCodeResend = ({
    onResend,
    initialCooldownSeconds = EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
}: LoginEmailCodeResendProps) => {
    const { t } = useTranslation();
    const hintId = useId();
    const secondsUntil = useCallback((deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)), []);
    // A deadline instead of a decrementing counter: browsers throttle timers
    // in background tabs, and the wait must still end on time.
    const [availableAt, setAvailableAt] = useState(() => Date.now() + initialCooldownSeconds * 1000);
    const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(availableAt));
    const [isSending, setIsSending] = useState(false);
    const [notice, setNotice] = useState<Notice>(null);
    // State lands after the next render; a fast double click must not slip
    // through in between.
    const isSendingRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(
        () => () => {
            isMountedRef.current = false;
        },
        [],
    );

    useEffect(() => {
        setSecondsLeft(secondsUntil(availableAt));
        const timer = window.setInterval(() => {
            const left = secondsUntil(availableAt);
            setSecondsLeft(left);
            if (left === 0) {
                window.clearInterval(timer);
            }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [availableAt, secondsUntil]);

    const startCooldown = (seconds: number) => {
        const deadline = Date.now() + seconds * 1000;
        setAvailableAt(deadline);
        setSecondsLeft(secondsUntil(deadline));
    };

    const handleClick = async () => {
        if (isSendingRef.current || secondsUntil(availableAt) > 0) {
            return;
        }
        isSendingRef.current = true;
        setIsSending(true);
        setNotice(null);

        let result: EmailCodeResendResult;
        try {
            result = await onResend();
        } catch {
            result = { kind: 'failed' };
        }
        isSendingRef.current = false;
        if (!isMountedRef.current) {
            return;
        }
        setIsSending(false);

        if (result.kind === 'sent') {
            setNotice('sent');
            startCooldown(result.resendAvailableInSeconds ?? EMAIL_CODE_RESEND_COOLDOWN_SECONDS);
        } else if (result.kind === 'tooMany') {
            setNotice('tooMany');
            startCooldown(EMAIL_CODE_RESEND_COOLDOWN_SECONDS);
        } else if (result.kind === 'failed') {
            // Nothing was mailed, so trying again right away is fine.
            setNotice('failed');
        }
    };

    const isBlocked = isSending || secondsLeft > 0;
    const noticeText: Record<Exclude<Notice, null>, string> = {
        sent: t('twoFactorAuth.activate.email.resend.sent'),
        failed: t('twoFactorAuth.activate.email.resend.failed'),
        tooMany: t('twoFactorAuth.activate.email.resend.tooMany'),
    };

    return (
        <div className="loginEmailCodeResend">
            <p className="loginEmailCodeResend__headline">{t('twoFactorAuth.activate.email.resend.headline')}</p>
            {/* aria-disabled, not disabled: the button keeps keyboard focus
                while the countdown runs instead of dropping it on <body>. */}
            <button
                type="button"
                className="loginEmailCodeResend__link"
                aria-disabled={isBlocked}
                aria-describedby={hintId}
                onClick={handleClick}
            >
                {secondsLeft > 0
                    ? t('twoFactorAuth.activate.email.resend.countdown', {
                          time: formatResendCountdown(secondsLeft),
                      })
                    : t('twoFactorAuth.activate.email.resend.new')}
            </button>
            <p id={hintId} className="loginEmailCodeResend__hint">
                {t('twoFactorAuth.activate.email.resend.onlyLatest')}
            </p>
            {/* Always rendered: a live region must exist before its text
                changes, or screen readers miss the announcement. */}
            <p
                role="status"
                className={`loginEmailCodeResend__status${
                    notice && notice !== 'sent' ? ' loginEmailCodeResend__status--error' : ''
                }`}
            >
                {notice === 'sent' && <CheckCircleOutline fontSize="inherit" aria-hidden="true" />}
                {notice && notice !== 'sent' && <ErrorOutline fontSize="inherit" aria-hidden="true" />}
                {notice && noticeText[notice]}
            </p>
        </div>
    );
};
