export type VerificationFailureKind =
    | 'console-error'
    | 'uncaught-error'
    | 'unhandled-rejection'
    | 'unexpected-request'
    | 'fallback';

export interface ExpectedVerificationFailure {
    kind: VerificationFailureKind;
    message: string;
    count: number;
}

// Attribution only: the FIRST RECORDED EVENT may be expected, not the primary failure.
// Capture synchronously while its caller remains on stack; never change global stack settings.
type VerificationOrigin = {
    version: 1;
    attribution: 'first-recorded-event';
    status: 'captured' | 'unavailable';
    truncated: boolean;
    kind?: VerificationFailureKind;
    message?: string;
    stack?: string;
    reason?: 'stack-unavailable' | 'no-recorded-event';
};
const captureFirstOrigin = (kind: VerificationFailureKind, message: string): VerificationOrigin => {
    const event = { version: 1, attribution: 'first-recorded-event', kind, message } as const;
    try {
        const stack = new Error().stack;
        if (typeof stack === 'string' && stack.length > 0) {
            const bounded = stack.split('\n').slice(0, 16).join('\n').slice(0, 4096);
            return { ...event, status: 'captured', stack: bounded, truncated: bounded !== stack };
        }
    } catch {
        // Origin capture must never lose a recorded event or replace the original failure.
    }
    return { ...event, status: 'unavailable', reason: 'stack-unavailable', truncated: false };
};

// Expectations are local to one story and exact. A newly added error, or an
// expected failure that stopped happening, must both make the verification red.
export const createVerificationRecorder = (expected: ExpectedVerificationFailure[] = []) => {
    let firstOrigin: VerificationOrigin | undefined;
    const failures: Array<{ kind: VerificationFailureKind; message: string }> = [];
    return {
        record(kind: VerificationFailureKind, message: string) {
            failures.push({ kind, message });
            if (failures.length === 1) firstOrigin = captureFirstOrigin(kind, message);
        },
        assertComplete() {
            const unexpected = failures.filter(
                (failure) => !expected.some((item) => item.kind === failure.kind && item.message === failure.message),
            );
            const mismatches = expected.flatMap((item) => {
                const received = failures.filter(
                    (failure) => item.kind === failure.kind && item.message === failure.message,
                ).length;
                return received === item.count
                    ? []
                    : [{ kind: item.kind, message: item.message, expected: item.count, received }];
            });
            const messages = [
                ...unexpected.map((failure) => `${failure.kind}: ${failure.message}`),
                ...mismatches.map(
                    (item) => `${item.kind}: ${item.message}: expected ${item.expected}, received ${item.received}`,
                ),
            ];
            if (messages.length)
                throw Object.assign(new Error(`Story verification failed:\n${messages.join('\n')}`), {
                    verificationFailures: { unexpected, mismatches },
                    verificationOrigin: firstOrigin ?? {
                        version: 1,
                        attribution: 'first-recorded-event',
                        status: 'unavailable',
                        reason: 'no-recorded-event',
                        truncated: false,
                    },
                });
        },
    };
};

export const isProductRequest = (url: string) => /\/(service|api|auth)(\/|$)/.test(new URL(url).pathname);
