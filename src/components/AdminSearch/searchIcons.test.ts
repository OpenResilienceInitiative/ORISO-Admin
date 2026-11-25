import { describe, expect, it } from 'vite-plus/test';
import { glyphFor } from './searchIcons';

describe('glyphFor: results wear the sidebar glyph of the thing they are', () => {
    it('uses the topic glyph for topics and departments (Fachbereiche), not a tree', () => {
        expect(glyphFor({ id: 'topic:1', kind: 'topic' })).toBe('topics');
        expect(glyphFor({ id: 'department:1:2', kind: 'department' })).toBe('topics');
    });

    it('uses the sidebar glyphs for tenants, agencies and accounts', () => {
        expect(glyphFor({ id: 'tenant:1', kind: 'tenant' })).toBe('tenants');
        expect(glyphFor({ id: 'agency:1', kind: 'agency' })).toBe('counseling');
        expect(glyphFor({ id: 'account:consultants:a', kind: 'account' })).toBe('users');
    });

    it('uses the glyph of the section for pages and tabs', () => {
        expect(glyphFor({ id: 'page:agency', kind: 'page' })).toBe('counseling');
        expect(glyphFor({ id: 'page:topics', kind: 'page' })).toBe('topics');
        expect(glyphFor({ id: 'settings:legal', kind: 'tab' })).toBe('displaySettings');
        expect(glyphFor({ id: 'users:counsellors', kind: 'tab' })).toBe('users');
        expect(glyphFor({ id: 'logs:deletions', kind: 'tab' })).toBe('logs');
        expect(glyphFor({ id: 'tenant:smtp@7', kind: 'tab' })).toBe('tenants');
    });

    it('puts personal tiles under "My account" and leaves other tiles to the neutral icon', () => {
        expect(glyphFor({ id: 'account:password@page:account', kind: 'setting', level: 'personal' })).toBe('profile');
        expect(glyphFor({ id: 'legal:imprint@settings:legal', kind: 'setting', level: 'platform' })).toBeUndefined();
    });
});
