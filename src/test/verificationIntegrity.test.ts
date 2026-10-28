import { describe, expect, it, vi } from 'vite-plus/test';
import { createVerificationRecorder, isProductRequest } from '../../.storybook/verificationIntegrity';

describe('verification integrity', () => {
    it.each(['console-error', 'uncaught-error', 'unhandled-rejection', 'unexpected-request', 'fallback'] as const)(
        'rejects an unexpected %s even when rendering completed',
        (kind) => {
            const recorder = createVerificationRecorder();
            recorder.record(kind, 'controlled failure');
            expect(() => recorder.assertComplete()).toThrow(`${kind}: controlled failure`);
        },
    );

    it('accepts only the declared expected error and exact count', () => {
        const recorder = createVerificationRecorder([{ kind: 'console-error', message: 'expected boom', count: 1 }]);
        recorder.record('console-error', 'expected boom');
        expect(() => recorder.assertComplete()).not.toThrow();
        recorder.record('console-error', 'another failure');
        expect(() => recorder.assertComplete()).toThrow('another failure');
    });

    it('fails when an expected error never occurs or occurs twice', () => {
        const recorder = createVerificationRecorder([{ kind: 'uncaught-error', message: 'boom', count: 1 }]);
        expect(() => recorder.assertComplete()).toThrow('expected 1');
        recorder.record('uncaught-error', 'boom');
        recorder.record('uncaught-error', 'boom');
        expect(() => recorder.assertComplete()).toThrow('received 2');
    });

    it('does not carry expected errors or failures into another story', () => {
        const first = createVerificationRecorder();
        first.record('fallback', 'Needs live app data');
        expect(() => first.assertComplete()).toThrow('fallback');
        expect(() => createVerificationRecorder().assertComplete()).not.toThrow();
    });

    it.each(['/service/tenants', '/admin/api/session', '/api/report', '/auth/token'])(
        'identifies the product request %s',
        (path) => expect(isProductRequest(`https://example.test${path}`)).toBe(true),
    );

    it.each(['/mockServiceWorker.js', '/admin/env.js', '/src/component.tsx', '/asset.svg'])(
        'does not classify static loading %s as a product API',
        (path) => expect(isProductRequest(`https://example.test${path}`)).toBe(false),
    );
});

it('preserves distinct multiline events and count mismatches on the same unchanged thrown Error', () => {
    const recorder = createVerificationRecorder([{ kind: 'console-error', message: 'expected', count: 2 }]);
    recorder.record('console-error', 'first line\nsecond line');
    recorder.record('fallback', 'separate event');
    expect(() => recorder.assertComplete()).toThrow(
        expect.objectContaining({
            name: 'Error',
            message:
                'Story verification failed:\nconsole-error: first line\nsecond line\nfallback: separate event\nconsole-error: expected: expected 2, received 0',
            verificationFailures: {
                unexpected: [
                    { kind: 'console-error', message: 'first line\nsecond line' },
                    { kind: 'fallback', message: 'separate event' },
                ],
                mismatches: [{ kind: 'console-error', message: 'expected', expected: 2, received: 0 }],
            },
        }),
    );
});

it('attributes the first recorded event caller, even when it was expected, without changing failure bytes', () => {
    const recorder = createVerificationRecorder([{ kind: 'console-error', message: 'expected first', count: 1 }]);
    function originalConsoleCaller() {
        recorder.record('console-error', 'expected first');
    }
    originalConsoleCaller();
    recorder.record('fallback', 'unexpected second');
    try {
        recorder.assertComplete();
        throw new Error('Expected recorder failure');
    } catch (error: any) {
        expect(error.verificationOrigin).toMatchObject({
            version: 1,
            attribution: 'first-recorded-event',
            kind: 'console-error',
            message: 'expected first',
            status: 'captured',
            truncated: false,
        });
        expect(error.verificationOrigin.stack).toContain('originalConsoleCaller');
        expect(error.verificationOrigin.stack).not.toContain('assertComplete');
        expect(error.message).toBe('Story verification failed:\nfallback: unexpected second');
        expect(error.verificationFailures).toEqual({
            unexpected: [{ kind: 'fallback', message: 'unexpected second' }],
            mismatches: [],
        });
    }
});

it.each(['lines', 'characters', 'missing', 'throwing'] as const)(
    'captures once and bounds first origin: %s',
    (kind) => {
        const NativeError = Error;
        let reads = 0;
        const recorder = createVerificationRecorder();
        vi.stubGlobal(
            'Error',
            class extends NativeError {
                constructor() {
                    super();
                    Object.defineProperty(this, 'stack', {
                        get() {
                            reads += 1;
                            if (kind === 'throwing') throw new NativeError('stack unavailable');
                            if (kind === 'missing') return undefined;
                            return kind === 'lines'
                                ? Array.from({ length: 30 }, (_, i) => `frame${i}`).join('\n')
                                : 'x'.repeat(5000);
                        },
                    });
                }
            },
        );
        try {
            recorder.record('console-error', 'first');
            recorder.record('fallback', 'second');
        } finally {
            vi.unstubAllGlobals();
        }
        expect(reads).toBe(1);
        try {
            recorder.assertComplete();
        } catch (error: any) {
            expect(error.verificationFailures.unexpected).toEqual([
                { kind: 'console-error', message: 'first' },
                { kind: 'fallback', message: 'second' },
            ]);
            const origin = error.verificationOrigin;
            if (kind === 'missing' || kind === 'throwing') {
                expect(origin).toEqual({
                    version: 1,
                    attribution: 'first-recorded-event',
                    kind: 'console-error',
                    message: 'first',
                    status: 'unavailable',
                    reason: 'stack-unavailable',
                    truncated: false,
                });
            } else {
                expect(origin.status).toBe('captured');
                expect(origin.truncated).toBe(true);
                expect(origin.stack.length).toBeLessThanOrEqual(4096);
                expect(origin.stack.split('\n').length).toBeLessThanOrEqual(16);
            }
        }
    },
);

it('distinguishes no recorded event from unavailable stack on a missing expected count', () => {
    const recorder = createVerificationRecorder([{ kind: 'fallback', message: 'never happened', count: 1 }]);
    expect(() => recorder.assertComplete()).toThrow(
        expect.objectContaining({
            verificationOrigin: {
                version: 1,
                attribution: 'first-recorded-event',
                status: 'unavailable',
                reason: 'no-recorded-event',
                truncated: false,
            },
        }),
    );
});
