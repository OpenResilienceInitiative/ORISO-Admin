import { describe, expect, it } from 'vite-plus/test';
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
