import { metrics, type Counter } from '@opentelemetry/api';

/**
 * Failed admin sign-in attempts as one OpenTelemetry counter, exported to our
 * self-hosted SigNoz collector via the MeterProvider from
 * `webVitalsMeterProvider.ts` (`service.name` = 'admin'; ORISO-Frontend ships
 * the same meter/counter names under `service.name` = 'frontend').
 *
 * Why this exists: in September 2026 the Dev realm lost its 2FA direct-grant
 * flow and every counsellor login failed for days without anybody noticing,
 * because neither login screen showed anything and nothing was measured. With
 * this counter a spike of `outcome=credentials` or `outcome=unavailable` is
 * visible in SigNoz within one export interval.
 *
 * The meter name ('login-tracker') and the counter name ('login_failure') are
 * a dashboard contract: the SigNoz panel queries them by string.
 *
 * Deliberately NOT included, ever: username, e-mail, tenant, IP, user agent,
 * or anything else that could identify who failed to sign in. The three
 * attributes describe the health of the login path, not a person (ADR-011).
 */
export type LoginFailureOutcome = 'credentials' | 'otp_required' | 'access_denied' | 'unavailable';

export type LoginFailureTransport = 'bad_request' | 'unauthorized' | 'network' | 'unexpected';

export interface LoginFailureRecord {
    outcome: LoginFailureOutcome;
    transport: LoginFailureTransport;
    /** Whether the attempt already carried a one-time code. */
    stage: 'password' | 'otp';
}

let counter: Counter | undefined;

/**
 * Lazily resolved so the meter is created after the MeterProvider was
 * registered. A meter obtained at import time would snapshot the no-op
 * provider forever.
 */
const getCounter = (): Counter => {
    if (!counter) {
        counter = metrics.getMeter('login-tracker').createCounter('login_failure', {
            description: 'Failed sign-in attempts in the ORISO admin panel, by outcome, transport and stage',
        });
    }
    return counter;
};

/** Best-effort: telemetry must never break the login screen. */
export const recordLoginFailure = (record: LoginFailureRecord): void => {
    try {
        getCounter().add(1, {
            outcome: record.outcome,
            transport: record.transport,
            stage: record.stage,
        });
    } catch {
        /* telemetry is best-effort */
    }
};

/** Test seam. */
export const resetLoginFailureTrackerForTests = (): void => {
    counter = undefined;
};
