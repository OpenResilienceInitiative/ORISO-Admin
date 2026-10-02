import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { M3Button } from '../../components/M3Button';

/** Used when the realm reports no cooldown of its own (a Keycloak from before #1338). */
export const RESEND_FALLBACK_COOLDOWN_SECONDS = 30;

/**
 * Rejection reason for a caller that has already put the reason on screen itself.
 * The login form names the real problem ("too many codes, wait 12 minutes"), and a
 * second generic line under the link would only add noise.
 */
export const RESEND_ERROR_ALREADY_SHOWN = 'resend-error-already-shown';

/**
 * Rejection reason for a request that never left the browser, so there is nothing
 * to wait for. A cooldown here would kill the link without a code being on its way.
 */
export const RESEND_NOT_ATTEMPTED = 'resend-not-attempted';

/**
 * A resend answer that carries what the realm said about waiting. The wait travels
 * with the answer instead of through the `cooldownSeconds` prop, because a prop
 * read inside the click's own promise callback is one render out of date: an
 * expired ten-minute wait would be re-armed over the thirty seconds the realm has
 * just granted.
 */
export class ResendError extends Error {
    constructor(message: string, readonly waitSeconds?: number) {
        super(message);
        this.name = 'ResendError';
    }
}

interface OtpResendLinkProps {
    /**
     * Asks the realm for a new code. Resolving means the request was answered,
     * rejecting means it was not. The link reports that answer, never the click.
     * The resolved number, and `ResendError.waitSeconds` on a rejection, is the
     * wait the realm named for THIS answer.
     */
    onResend: () => Promise<number | void>;
    /**
     * Seconds the realm says to wait, from `resendAvailableInSeconds`. Undefined
     * against an older realm, which is why the countdown has its own fallback.
     */
    cooldownSeconds?: number;
}

const formatCountdown = (secondsLeft: number): string =>
    `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

/**
 * "Send a new code" under the one-time-code field of the admin login
 * (ORISO-UserService#1338).
 *
 * The admin panel had no such link at all. Anyone whose code expired — or who
 * opened the login a second time, which silently invalidates the first code — had
 * to reload and type their password again.
 *
 * The confirmation says the request was sent, not that a mail was. Keycloak answers
 * "code mailed" and "too soon, keep the one you have" with the exact same 400
 * challenge, so claiming delivery would be a guess. Either way the user's next step
 * is the same, and the line below the link states it: use the newest code.
 */
const OtpResendLink = ({ onResend, cooldownSeconds }: OtpResendLinkProps) => {
    const { t } = useTranslation();
    const [isSending, setIsSending] = useState(false);
    const [isRequested, setIsRequested] = useState(false);
    const [hasFailed, setHasFailed] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // One interval for the whole countdown. A timeout chain would drift, and a
    // per-second effect would tear the interval down and up on every tick.
    const isCountingDown = secondsLeft > 0;
    useEffect(() => {
        if (!isCountingDown) {
            return undefined;
        }
        const interval = window.setInterval(() => {
            setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
        }, 1000);
        return () => window.clearInterval(interval);
    }, [isCountingDown]);

    // The realm's own figure may extend the wait, never shorten it behind the
    // user's back: a shorter one would invite a click that the server refuses.
    useEffect(() => {
        if (typeof cooldownSeconds === 'number' && cooldownSeconds > 0) {
            setSecondsLeft((current) => Math.max(current, cooldownSeconds));
        }
    }, [cooldownSeconds]);

    /**
     * Starts the wait THIS answer named, or the local fallback when the realm named
     * none. It deliberately ignores `cooldownSeconds`: that prop is one render old
     * in here, so a wait that has already run out would be served a second time.
     */
    const armCooldown = useCallback((waitSeconds?: number) => {
        setSecondsLeft(waitSeconds && waitSeconds > 0 ? waitSeconds : RESEND_FALLBACK_COOLDOWN_SECONDS);
    }, []);

    const handleClick = useCallback(() => {
        if (isSending || secondsLeft > 0) {
            return;
        }
        setIsSending(true);
        setHasFailed(false);
        setIsRequested(false);

        onResend()
            .then((waitSeconds) => {
                if (!isMountedRef.current) {
                    return;
                }
                setIsRequested(true);
                armCooldown(typeof waitSeconds === 'number' ? waitSeconds : undefined);
            })
            .catch((reason: unknown) => {
                if (!isMountedRef.current) {
                    return;
                }
                const error = reason as ResendError | null;
                if (error?.message === RESEND_NOT_ATTEMPTED) {
                    // Nothing was sent, so no wait is owed — and a dead link would
                    // hide the only control that can put it right.
                    return;
                }
                setHasFailed(error?.message !== RESEND_ERROR_ALREADY_SHOWN);
                // A refusal is still an answer: without a wait here, "too many
                // attempts" would be followed by a link that invites the next one.
                armCooldown(error?.waitSeconds);
            })
            .finally(() => {
                if (isMountedRef.current) {
                    setIsSending(false);
                }
            });
    }, [armCooldown, isSending, onResend, secondsLeft]);

    return (
        <Box sx={{ mb: 2 }} data-testid="otp-resend">
            {/* The shared M3 text button, not a raw MUI one: it owns the primary
                token and the M3 disabled treatment, which a running countdown needs. */}
            <M3Button
                type="button"
                variant="text"
                disabled={isCountingDown || isSending}
                loading={isSending}
                onClick={handleClick}
            >
                {isCountingDown
                    ? t('login.otp.resend.actionIn', { countdown: formatCountdown(secondsLeft) })
                    : t('login.otp.resend.action')}
            </M3Button>
            {isRequested && (
                <Typography variant="body2" sx={{ color: 'var(--admin-status-success, #0a882f)' }} role="status">
                    {t('login.otp.resend.requested')}
                </Typography>
            )}
            <Typography variant="caption" component="p" sx={{ color: 'var(--m3-on-surface-variant, #444748)' }}>
                {t('login.otp.resend.onlyNewest')}
            </Typography>
            {hasFailed && (
                <Typography
                    variant="caption"
                    component="p"
                    sx={{ color: 'var(--admin-status-error, #cc0000)' }}
                    role="alert"
                >
                    {t('login.otp.resend.failed')}
                </Typography>
            )}
        </Box>
    );
};

export default OtpResendLink;
