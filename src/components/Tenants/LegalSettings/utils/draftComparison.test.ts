import { describe, expect, it } from 'vitest';
import { isSameDraftContent } from './draftComparison';

const saved = {
    content: {
        de: '<h2>Muster-Impressum für Träger</h2><p>Musterstraße 1, 12345 Musterstadt.</p>',
        en: '<h2>Template imprint</h2><p>Sample street 1.</p>',
    },
    consent: { de: 'Ich willige ein {{legal_links}}' },
};

describe('isSameDraftContent — is the editor still showing the saved draft?', () => {
    it('treats an untouched draft as unchanged', () => {
        expect(isSameDraftContent(saved, saved, { compareConsent: true })).toBe(true);
    });

    it('treats heading ids the editor generated on load as no change', () => {
        // Measured in the story run: the saved draft had no heading ids, the editor
        // reported the same text with generated ids, and the send action said "unsaved".
        const asTheEditorShowsIt = {
            ...saved,
            content: {
                de: '<h2 id="muster-impressum-fur-trager">Muster-Impressum für Träger</h2><p>Musterstraße 1, 12345 Musterstadt.</p>',
                en: '<h2 id="template-imprint">Template imprint</h2><p>Sample street 1.</p>',
            },
        };
        expect(isSameDraftContent(asTheEditorShowsIt, saved, { compareConsent: true })).toBe(true);
    });

    it('still counts a real text change', () => {
        const edited = {
            ...saved,
            content: { ...saved.content, de: saved.content.de.replace('Musterstadt', 'Beispielstadt') },
        };
        expect(isSameDraftContent(edited, saved, { compareConsent: true })).toBe(false);
    });

    it('still counts a renamed anchor, because existing ids are never regenerated', () => {
        const savedWithAnchor = {
            ...saved,
            content: { ...saved.content, de: '<h2 id="impressum">Muster-Impressum für Träger</h2>' },
        };
        const renamed = {
            ...saved,
            content: { ...saved.content, de: '<h2 id="angaben">Muster-Impressum für Träger</h2>' },
        };
        expect(isSameDraftContent(renamed, savedWithAnchor, { compareConsent: true })).toBe(false);
    });

    it('counts a language that exists on only one side', () => {
        const withFrench = { ...saved, content: { ...saved.content, fr: '<p>Mentions légales</p>' } };
        expect(isSameDraftContent(withFrench, saved, { compareConsent: true })).toBe(false);
    });

    it('compares the consent sentence only when asked to', () => {
        const otherConsent = { ...saved, consent: { de: 'Anderer Satz {{legal_links}}' } };
        expect(isSameDraftContent(otherConsent, saved, { compareConsent: true })).toBe(false);
        expect(isSameDraftContent(otherConsent, saved, { compareConsent: false })).toBe(true);
    });
});
