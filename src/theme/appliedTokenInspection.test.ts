import { describe, expect, it, vi } from 'vitest';

import { observeTokenReference } from './AppliedTokenInspector';

import { compositeColor, inspectAppliedTokens, observationStatus } from './appliedTokenInspection';

describe('token evidence classification (no simulated computed styles)', () => {
    it('accepts equivalent browser serializations instead of comparing authored spelling', () => {
        expect(
            observationStatus({
                actual: 'rgb(255, 0, 0)',
                authored: '#f00',
                normalized: { expected: 'rgb(255, 0, 0)', actual: 'rgb(255, 0, 0)', calculated: null },
            }),
        ).toBe('match');
    });
    it('does not let a correct calculated root value hide an overridden component', () => {
        expect(
            observationStatus({
                actual: 'rgb(0, 255, 0)',
                authored: '#00ff00',
                normalized: { expected: 'rgb(255, 0, 0)', actual: 'rgb(0, 255, 0)', calculated: 'rgb(255, 0, 0)' },
            }),
        ).toBe('mismatch');
    });
    it('keeps an absent computed value missing even when a canonical value exists', () => {
        expect(
            observationStatus({
                actual: null,
                authored: 'initial',
                normalized: { expected: 'rgb(255, 0, 0)', actual: null, calculated: null },
            }),
        ).toBe('missing');
    });
    it('distinguishes unresolved authored variables from an absent declaration', () => {
        expect(
            observationStatus({
                actual: null,
                authored: 'var(--absent)',
                normalized: { expected: 'rgb(255, 0, 0)', actual: null, calculated: null },
            }),
        ).toBe('unresolved');
    });
    it('fails closed when canonical normalization cannot be established', () => {
        expect(
            observationStatus({
                actual: 'rgb(255, 0, 0)',
                authored: null,
                normalized: { expected: null, actual: 'rgb(255, 0, 0)', calculated: null },
            }),
        ).toBe('unresolved');
    });
    it('fails closed when the actual value cannot be normalized', () => {
        expect(
            observationStatus({
                actual: 'not-a-color',
                authored: null,
                normalized: { expected: 'rgb(255, 0, 0)', actual: null, calculated: null },
            }),
        ).toBe('unresolved');
    });
    it('composites alpha against the supplied background rather than assuming white', () => {
        expect(compositeColor({ channels: [0, 0, 0], alpha: 0.5 }, [255, 255, 255])).toEqual([128, 128, 128]);
        expect(compositeColor({ channels: [0, 0, 0], alpha: 0.5 }, [100, 50, 20])).toEqual([50, 25, 10]);
    });
    it('rejects disconnected reference roots before collecting evidence', () => {
        expect(() =>
            inspectAppliedTokens({
                root: document.createElement('div'),
                context: { primaryColor: '#A5000A', scheme: 'light', locale: 'de' },
                reference: 'field',
            }),
        ).toThrow('connected browser reference');
    });
});

describe('real DOM reference observation ownership (not computed CSS evidence)', () => {
    it('rejects a specimen root that contains its own inspector output', () => {
        const reference = document.createElement('div');
        const inspector = document.createElement('section');
        inspector.setAttribute('data-applied-token-inspector', '');
        reference.append(inspector);
        document.body.append(reference);
        let release: (() => void) | undefined;
        try {
            expect(() => {
                release = observeTokenReference(reference, () => undefined);
            }).toThrow('specimen root must exclude inspector output');
        } finally {
            release?.();
            reference.remove();
        }
    });
    it('observes real field, root-token and head changes while ignoring sibling report and probe mutations', async () => {
        const reference = document.createElement('div');
        const input = document.createElement('input');
        reference.append(input);
        const inspector = document.createElement('section');
        inspector.setAttribute('data-applied-token-inspector', '');
        const probe = document.createElement('span');
        const sheet = document.createElement('style');
        document.body.append(reference, inspector);
        const changed = vi.fn();
        const release = observeTokenReference(reference, changed);
        const priorToken = document.documentElement.style.getPropertyValue('--inspection-ownership-test');
        const priorPriority = document.documentElement.style.getPropertyPriority('--inspection-ownership-test');
        try {
            inspector.style.color = 'red';
            document.body.append(probe);
            probe.style.color = 'blue';
            probe.remove();
            await Promise.resolve();
            expect(changed).not.toHaveBeenCalled();
            input.style.color = 'green';
            await Promise.resolve();
            expect(changed).toHaveBeenCalledTimes(1);
            document.documentElement.style.setProperty('--inspection-ownership-test', 'red');
            await Promise.resolve();
            expect(changed).toHaveBeenCalledTimes(2);
            document.head.append(sheet);
            await Promise.resolve();
            expect(changed).toHaveBeenCalledTimes(3);
        } finally {
            release();
            if (priorToken)
                document.documentElement.style.setProperty('--inspection-ownership-test', priorToken, priorPriority);
            else document.documentElement.style.removeProperty('--inspection-ownership-test');
            reference.remove();
            inspector.remove();
            probe.remove();
            sheet.remove();
        }
    });
    it('disconnects idempotently so later specimen changes cannot request another read', async () => {
        const reference = document.createElement('div');
        document.body.append(reference);
        const changed = vi.fn();
        const release = observeTokenReference(reference, changed);
        try {
            release();
            release();
            reference.style.color = 'green';
            await Promise.resolve();
            expect(changed).not.toHaveBeenCalled();
        } finally {
            release();
            reference.remove();
        }
    });
});

describe('CSS completion observation mechanism (mocked computed value, not browser CSS proof)', () => {
    it.each(['transitionend', 'transitioncancel', 'animationend', 'animationcancel'])(
        'refreshes a changed computed result without a DOM mutation at %s',
        async (type) => {
            const reference = document.createElement('div');
            const input = document.createElement('input');
            reference.append(input);
            document.body.append(reference);
            let color = 'rgb(1, 2, 3)';
            const computed = document.createElement('span').style;
            Object.defineProperty(computed, 'backgroundColor', { get: () => color });
            const read = vi.spyOn(window, 'getComputedStyle').mockReturnValue(computed);
            let report = getComputedStyle(input).backgroundColor;
            const refresh = vi.fn(() => {
                report = getComputedStyle(input).backgroundColor;
            });
            const release = observeTokenReference(reference, refresh);
            try {
                color = 'rgb(4, 5, 6)';
                await Promise.resolve();
                expect(refresh).not.toHaveBeenCalled();
                expect(report).toBe('rgb(1, 2, 3)');
                input.dispatchEvent(new Event(type, { bubbles: true }));
                expect(refresh).toHaveBeenCalledTimes(1);
                expect(report).toBe('rgb(4, 5, 6)');
            } finally {
                release();
                read.mockRestore();
                reference.remove();
            }
        },
    );
    it('ignores foreign and inspector output completion, and releases all motion listeners idempotently', () => {
        const reference = document.createElement('div');
        const input = document.createElement('input');
        reference.append(input);
        const foreign = document.createElement('button');
        const output = document.createElement('section');
        output.setAttribute('data-applied-token-inspector', '');
        document.body.append(reference, foreign, output);
        const refresh = vi.fn();
        const release = observeTokenReference(reference, refresh);
        try {
            ['transitionend', 'transitioncancel', 'animationend', 'animationcancel'].forEach((type) => {
                foreign.dispatchEvent(new Event(type, { bubbles: true }));
                output.dispatchEvent(new Event(type, { bubbles: true }));
            });
            expect(refresh).not.toHaveBeenCalled();
            reference.append(output);
            output.dispatchEvent(new Event('transitionend', { bubbles: true }));
            expect(refresh).not.toHaveBeenCalled();
            release();
            release();
            ['transitionend', 'transitioncancel', 'animationend', 'animationcancel'].forEach((type) =>
                input.dispatchEvent(new Event(type, { bubbles: true })),
            );
            expect(refresh).not.toHaveBeenCalled();
        } finally {
            release();
            reference.remove();
            foreign.remove();
            output.remove();
        }
    });
});
