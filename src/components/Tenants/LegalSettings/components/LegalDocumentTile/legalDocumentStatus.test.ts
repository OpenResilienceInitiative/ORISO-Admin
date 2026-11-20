import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vite-plus/test';
import { dpaState, legalDocumentStatus, legalTextState } from './legalDocumentStatus';

const t = ((key: string) => `t:${key}`) as unknown as TFunction;

describe('legalDocumentStatus', () => {
    it('shows a published document as plain and the other two states as needing attention', () => {
        expect(legalDocumentStatus(t, 'published')).toEqual({ label: 't:legal.status.published', tone: 'neutral' });
        expect(legalDocumentStatus(t, 'draft')).toEqual({ label: 't:legal.status.draft', tone: 'attention' });
        expect(legalDocumentStatus(t, 'empty')).toEqual({ label: 't:legal.status.empty', tone: 'attention' });
    });
});

describe('legalTextState (imprint, privacy statement)', () => {
    const live = { isPublished: true, differsFromPublished: false, hasConflict: false };

    it('is published while the screen holds exactly the live text', () => {
        expect(legalTextState(live)).toBe('published');
    });

    it('is a draft as soon as the screen differs from the live text', () => {
        expect(legalTextState({ ...live, isPublished: false, differsFromPublished: true })).toBe('draft');
    });

    it('is empty when nothing is live and nothing is written', () => {
        expect(legalTextState({ isPublished: false, differsFromPublished: false, hasConflict: false })).toBe('empty');
    });

    it('is a draft while a draft conflict is open, even when the screen equals the live text', () => {
        expect(legalTextState({ ...live, hasConflict: true })).toBe('draft');
    });
});

describe('dpaState (data processing agreement)', () => {
    it('lets a stored draft win over the published versions', () => {
        expect(dpaState({ hasDraft: true, versionCount: 3 })).toBe('draft');
        expect(dpaState({ hasDraft: true, versionCount: 0 })).toBe('draft');
    });

    it('is published once a version exists and empty before that', () => {
        expect(dpaState({ hasDraft: false, versionCount: 1 })).toBe('published');
        expect(dpaState({ hasDraft: false, versionCount: 0 })).toBe('empty');
    });
});
