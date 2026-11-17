import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { applyDefaultTitle, restoreDefaultTitle, showSectionTitle } from './tabTitle';

describe('section tab title', () => {
    beforeEach(() => {
        document.head.innerHTML = '<title>Online-Beratung Admin</title>';
    });

    it('shows only the section name and restores the default title', () => {
        showSectionTitle('Konten');
        expect(document.title).toBe('Konten');
        showSectionTitle('Mein Account');
        expect(document.title).toBe('Mein Account');
        restoreDefaultTitle();
        expect(document.title).toBe('Online-Beratung Admin');
    });

    it('keeps the section name when a tenant title arrives late', () => {
        showSectionTitle('Konten');
        applyDefaultTitle('Caritas Berlin');
        expect(document.title).toBe('Konten');
        restoreDefaultTitle();
        expect(document.title).toBe('Caritas Berlin');
    });

    it('sets the default title directly when no section title shows', () => {
        applyDefaultTitle('Caritas Berlin');
        expect(document.title).toBe('Caritas Berlin');
    });

    it('is a no-op to restore when no section title was shown', () => {
        restoreDefaultTitle();
        expect(document.title).toBe('Online-Beratung Admin');
    });
});
