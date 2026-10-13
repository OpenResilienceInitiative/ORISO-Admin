import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import { InviteComposer, type InviteComposerProps } from './InviteComposer';
import { invitePanelStorageKey, useInvitePanelCollapsed } from './InvitePanel';
import {
    searchAgencies,
    searchTenants,
    stubbedAgencyIdAllocation,
    stubbedTenantIdAllocation,
} from './inviteStoryFixtures';

// antd's Dropdown (split-button menus) queries matchMedia, which jsdom does not implement.
window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
})) as typeof window.matchMedia;

// Fallback text with `{{x}}` filled in, like the real `t` does with the German defaults.
const t = (_key: string, fallback?: string, options?: Record<string, unknown>) =>
    (fallback ?? _key).replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(options?.[name] ?? ''));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }));

const TEMPLATE: InviteEmailTemplateDTO = {
    id: 11,
    kind: 'COUNSELLOR_INVITE',
    name: 'Standard Berater:in',
    language: 'de',
    subject: 'Zugang',
    body: 'Hallo {{firstName}}',
    active: true,
    createDate: '2026-07-01T10:00:00Z',
    updateDate: null,
};

const renderPanel = (props: Partial<InviteComposerProps> = {}) =>
    render(
        <InviteComposer
            layout="panel"
            tab="counsellor"
            persistKey="INVITE_PANEL_TEST"
            viewer={{ scope: 'platform' }}
            clients={{
                agencyIdAllocation: stubbedAgencyIdAllocation,
                tenantIdAllocation: stubbedTenantIdAllocation,
                searchAgencies,
                searchTenants,
            }}
            templates={{ list: [TEMPLATE], selectedId: undefined, onManage: () => {} }}
            onSubmit={() => true}
            {...props}
        />,
    );

/*
 * ORISO-Admin#1127 — an untouched form read "2 of 5": Role and the "Neu" agency
 * are preset values, not something the admin has done. The stepper only counts
 * what the admin still has to set, and send stays off until all of it is set.
 */
describe('InvitePanel stepper (#1127)', () => {
    it('shows nothing done on an untouched form and counts only fields the admin must set', async () => {
        renderPanel();

        const summary = await screen.findByTestId('invite-panel-summary');
        expect(summary).toHaveTextContent('Noch offen: E-Mail & Name, Träger, E-Mail-Vorlage · 0 von 3');
        expect(screen.getByTestId('invite-panel-progress').children).toHaveLength(3);
        expect(screen.getByTestId('invite-panel-progress').querySelectorAll('[data-state="done"]')).toHaveLength(0);
    });

    // The tab preselects a template when exactly one of the kind is active; that pick is real progress.
    it('counts a selected template as done', async () => {
        renderPanel({ templates: { list: [TEMPLATE], selectedId: TEMPLATE.id, onManage: () => {} } });

        expect(await screen.findByTestId('invite-panel-summary')).toHaveTextContent(
            'Noch offen: E-Mail & Name, Träger · 1 von 3',
        );
        const states = [...screen.getByTestId('invite-panel-progress').children].map((segment) =>
            segment.getAttribute('data-state'),
        );
        expect(states).toEqual(['open', 'open', 'done']);
    });

    it('does not count a Träger that is fixed for the viewer', async () => {
        renderPanel({ viewer: { scope: 'tenant', ownTenant: { id: 7, name: 'Caritas Südbaden' } } });

        expect(await screen.findByTestId('invite-panel-summary')).toHaveTextContent(
            'Noch offen: E-Mail & Name, E-Mail-Vorlage · 0 von 2',
        );
    });

    it('keeps the send button off while any required field is open', async () => {
        renderPanel();

        await screen.findByTestId('invite-panel-summary');
        expect(screen.getByRole('button', { name: /einladen/i })).toBeDisabled();
    });
});

describe('useInvitePanelCollapsed on phones (#1127)', () => {
    const KEY = 'PHONE_TEST';
    const setViewport = (phone: boolean) => {
        window.matchMedia = ((query: string) => ({
            matches: phone && query.includes('max-width: 599px'),
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        })) as typeof window.matchMedia;
    };

    beforeEach(() => window.localStorage.removeItem(invitePanelStorageKey(KEY)));

    it('starts folded on a phone when nothing is stored for the tab', () => {
        setViewport(true);
        expect(renderHook(() => useInvitePanelCollapsed(KEY)).result.current[0]).toBe(true);
    });

    it('starts open on a wider screen', () => {
        setViewport(false);
        expect(renderHook(() => useInvitePanelCollapsed(KEY)).result.current[0]).toBe(false);
    });

    it('lets a stored choice win over the phone default, and remembers a change', () => {
        setViewport(true);
        window.localStorage.setItem(invitePanelStorageKey(KEY), 'false');
        const { result } = renderHook(() => useInvitePanelCollapsed(KEY));
        expect(result.current[0]).toBe(false);

        act(() => result.current[1](true));
        expect(window.localStorage.getItem(invitePanelStorageKey(KEY))).toBe('true');
    });
});
