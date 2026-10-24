import { describe, expect, it } from 'vitest';
import { ownDomAttributes } from './ownedDomAttributes';

describe('DOM attribute ownership', () => {
    it('restores original attributes, including absence, after an adapter releases them', () => {
        const element = document.createElement('div');
        element.setAttribute('aria-label', 'Original');
        const release = ownDomAttributes(element, { role: 'listbox', 'aria-label': 'Languages' });
        expect(element.getAttribute('role')).toBe('listbox');
        release();
        expect(element.hasAttribute('role')).toBe(false);
        expect(element.getAttribute('aria-label')).toBe('Original');
    });

    it('preserves changes made by a later owner during cleanup', () => {
        const element = document.createElement('div');
        const release = ownDomAttributes(element, { role: 'listbox', id: 'languages' });
        element.setAttribute('role', 'region');
        release();
        expect(element.getAttribute('role')).toBe('region');
        expect(element.hasAttribute('id')).toBe(false);
    });
});
