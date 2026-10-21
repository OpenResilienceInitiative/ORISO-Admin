import { captureStorybookAnimationCleanup } from './storybookAnimationCleanup';
import { createVerificationRecorder, type ExpectedVerificationFailure } from './verificationIntegrity';

let activeCleanup: (() => Promise<void>) | undefined;
let activeRecorder: ReturnType<typeof createVerificationRecorder> | undefined;

export const recordUnexpectedRequest = (request: Request) => {
    const message = `${request.method} ${request.url}`;
    if (activeRecorder) activeRecorder.record('unexpected-request', message);
    throw new Error(`Unexpected product API request: ${message}. Add a story-local MSW handler.`);
};

const snapshotAttributes = (element: HTMLElement) => {
    const attributes = [...element.attributes].map(({ name, value }) => [name, value] as const);
    return () => {
        [...element.attributes].forEach(({ name }) => element.removeAttribute(name));
        attributes.forEach(([name, value]) => element.setAttribute(name, value));
    };
};

const snapshotStorage = (storage: Storage) => {
    const entries = Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => key !== null)
        .map((key) => [key, storage.getItem(key) ?? ''] as const);
    return () => {
        storage.clear();
        entries.forEach(([key, value]) => storage.setItem(key, value));
    };
};

export const beginStoryVerification = (
    expected: ExpectedVerificationFailure[] = [],
    cleanup: () => Promise<void> = async () => undefined,
) => {
    const releaseAnimations = captureStorybookAnimationCleanup();
    const recorder = createVerificationRecorder(expected);
    activeRecorder = recorder;
    const restoreRoot = snapshotAttributes(document.documentElement);
    const restoreBody = snapshotAttributes(document.body);
    const restoreLocalStorage = snapshotStorage(localStorage);
    const restoreSessionStorage = snapshotStorage(sessionStorage);
    // eslint-disable-next-line no-console -- Capture the original error sink; every intercepted error is forwarded.
    const originalError = console.error;
    // eslint-disable-next-line no-console -- Record errors without suppressing the original console output.
    console.error = (...args: unknown[]) => {
        recorder.record(
            'console-error',
            args.map((value) => (value instanceof Error ? value.message : String(value))).join(' '),
        );
        originalError(...args);
    };
    const onError = (event: ErrorEvent) => recorder.record('uncaught-error', event.message);
    const onRejection = (event: PromiseRejectionEvent) =>
        recorder.record(
            'unhandled-rejection',
            event.reason instanceof Error ? event.reason.message : String(event.reason),
        );
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    let sawFallback = false;
    const fallbackSelector = '[data-error-boundary], [data-story-fallback]';
    const inspectMutations = (records: MutationRecord[]) => {
        records.forEach((record) =>
            record.addedNodes.forEach((node) => {
                if (
                    node instanceof Element &&
                    (node.matches(fallbackSelector) || node.querySelector(fallbackSelector))
                ) {
                    sawFallback = true;
                }
            }),
        );
    };
    const observer = new MutationObserver(inspectMutations);
    observer.observe(document.body, { childList: true, subtree: true });

    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        try {
            inspectMutations(observer.takeRecords());
            if (sawFallback || document.querySelector('[data-error-boundary], [data-story-fallback]')) {
                recorder.record('fallback', 'A failure fallback replaced the story');
            }
            recorder.assertComplete();
        } finally {
            try {
                observer.disconnect();
                // eslint-disable-next-line no-console -- Restore the original error sink during guaranteed cleanup.
                console.error = originalError;
                window.removeEventListener('error', onError);
                window.removeEventListener('unhandledrejection', onRejection);
                activeRecorder = undefined;
                activeCleanup = undefined;
                restoreRoot();
                restoreBody();
                restoreLocalStorage();
                restoreSessionStorage();
            } finally {
                releaseAnimations();
            }
        }
    };
    let completed = false;
    const complete = async () => {
        if (completed) return;
        completed = true;
        const errors: unknown[] = [];
        try {
            await cleanup();
        } catch (error) {
            errors.push(error);
        }
        try {
            finish();
        } catch (error) {
            errors.unshift(error);
        }
        if (errors.length === 1) throw errors[0];
        if (errors.length) throw new AggregateError(errors, errors.map(String).join('\n'));
    };
    activeCleanup = complete;
    return complete;
};

export const finishStoryVerification = () => activeCleanup?.();
