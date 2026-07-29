import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fieldElementId, focusFirstInvalidField } from './formErrorNavigation';

describe('fieldElementId', () => {
    it('mirrors the antd id antd puts on the bound control', () => {
        expect(fieldElementId(['name'], 'tenantOnboarding')).toBe('tenantOnboarding_name');
        expect(fieldElementId(['signerName'])).toBe('signerName');
        expect(fieldElementId(['a', 0, 'b'], 'f')).toBe('f_a_0_b');
    });
});

describe('focusFirstInvalidField', () => {
    let scrollIntoView: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        scrollIntoView = vi.fn();
        // jsdom has no layout, hence no scrollIntoView implementation.
        Object.defineProperty(Element.prototype, 'scrollIntoView', {
            configurable: true,
            writable: true,
            value: scrollIntoView,
        });
        document.body.innerHTML = `
            <input id="onboarding_name" />
            <input id="onboarding_address" />
        `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('scrolls the first invalid field into view and puts the caret in it', () => {
        const moved = focusFirstInvalidField([{ name: ['address'], errors: ['required'] }], 'onboarding');

        expect(moved).toBe(true);
        expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
        expect(document.activeElement).toBe(document.getElementById('onboarding_address'));
    });

    it('uses the FIRST reported field, not the last', () => {
        focusFirstInvalidField(
            [
                { name: ['name'], errors: ['required'] },
                { name: ['address'], errors: ['required'] },
            ],
            'onboarding',
        );

        expect(document.activeElement).toBe(document.getElementById('onboarding_name'));
    });

    it('reports failure when the field has no element (so the host can fall back)', () => {
        expect(focusFirstInvalidField([{ name: ['missing'], errors: ['required'] }], 'onboarding')).toBe(false);
        expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('reports failure when nothing is invalid', () => {
        expect(focusFirstInvalidField([], 'onboarding')).toBe(false);
    });
});
