// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistantIdentity } from './index';

const save = vi.fn();
const fixtures = vi.hoisted(() => ({
    own: { assistantName: 'Carimat', assistantIcon: 'default' } as { assistantName?: string; assistantIcon?: string },
    readError: false,
    inherited: undefined as undefined | { id?: number; theming: { assistantName: string; assistantIcon: string } },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../hooks/useTenantAppearanceFormData', () => ({
    useTenantAppearanceFormData: () => ({
        data: fixtures.readError
            ? undefined
            : {
                  id: 1,
                  name: 'Tenant one',
                  theming: { ...fixtures.own, primaryColor: '#a5000a' },
              },
        isLoading: false,
        isError: fixtures.readError,
        mutate: save,
    }),
}));
vi.mock('../../../../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: (tenantId?: string) => ({
        data:
            tenantId === '1'
                ? fixtures.inherited
                : { id: 2, theming: { assistantName: 'Main helper', assistantIcon: 'default' } },
    }),
}));
vi.mock('../../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { serverSettingsMeta: undefined } }),
}));
afterEach(() => {
    cleanup();
    save.mockClear();
    fixtures.own = { assistantName: 'Carimat', assistantIcon: 'default' };
    fixtures.inherited = undefined;
    fixtures.readError = false;
});

describe('tenant assistant Appearance', () => {
    it('saves only the chosen identity so the existing mutation preserves fresh tenant branding', async () => {
        const { container: dialog } = render(<AssistantIdentity tenantId="1" />);
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.change(within(dialog).getByLabelText('settings.assistant.name'), {
            target: { value: 'My companion' },
        });
        fireEvent.click(within(dialog).getByLabelText('settings.assistant.robot 2'));
        fireEvent.click(within(dialog).getByText('card.edit.save'));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0].theming).toEqual({
            assistantName: 'My companion',
            assistantIcon: 'robot-1184077',
        });
    });

    it('uses the edited tenant effective identity, not the main tenant, without storing an inherited icon when only the name changes', async () => {
        fixtures.own = {};
        fixtures.inherited = { id: 1, theming: { assistantName: 'Inherited helper', assistantIcon: 'robot-1184077' } };
        render(<AssistantIdentity tenantId="1" />);
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        const name = screen.getByLabelText('settings.assistant.name');
        expect(screen.getByText(/Inherited helper/)).toBeVisible();
        expect(screen.getByRole('img', { name: 'settings.assistant.inheritedIcon' })).toBeVisible();
        expect(name).toHaveValue('');
        fireEvent.change(name, { target: { value: 'Own helper' } });
        fireEvent.click(screen.getByText('card.edit.save'));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0]).toEqual({ theming: { assistantName: 'Own helper' } });
    });

    it('shows only the neutral inherit label if the effective read is missing or belongs to another tenant', () => {
        fixtures.own = {};
        fixtures.inherited = { id: 2, theming: { assistantName: 'Wrong helper', assistantIcon: 'default' } };
        render(<AssistantIdentity tenantId="1" />);
        expect(screen.queryByText(/Wrong helper|Main helper|Carimat/)).toBeNull();
        expect(screen.queryByRole('img', { name: 'settings.assistant.inheritedIcon' })).toBeNull();
    });
    it('treats blank own values as inherited without freezing the inherited icon', async () => {
        fixtures.own = { assistantName: '   ', assistantIcon: '  ' };
        fixtures.inherited = { id: 1, theming: { assistantName: 'Platform helper', assistantIcon: 'robot-1184077' } };
        render(<AssistantIdentity tenantId="1" />);
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        expect(screen.getByLabelText('settings.assistant.name')).toHaveValue('');
        expect(screen.getByLabelText('settings.assistant.inherit')).toBeChecked();
        expect(screen.getByRole('img', { name: 'settings.assistant.inheritedIcon' })).toBeVisible();
        fireEvent.change(screen.getByLabelText('settings.assistant.name'), { target: { value: 'Own helper' } });
        fireEvent.click(screen.getByText('card.edit.save'));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0]).toEqual({ theming: { assistantName: 'Own helper' } });
    });
    it('saves the default identity without a broken upload preview', async () => {
        const { container } = render(<AssistantIdentity tenantId="1" />);
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        expect(container.querySelector('.ant-upload img')).toBeNull();
        fireEvent.click(screen.getByText('card.edit.save'));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0]).toEqual({ theming: {} });
    });
    it.each([
        [
            'image/png',
            'custom.png',
            Uint8Array.from(
                atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRLsAAAAASUVORK5CYII='),
                (c) => c.charCodeAt(0),
            ),
            /^data:image\/png;base64,/,
        ],
        [
            'image/svg+xml',
            'custom.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"/></svg>',
            /^data:image\/svg\+xml;base64,/,
        ],
    ])('previews and saves a custom %s through the Appearance form', async (type, name, artwork, prefix) => {
        const { container } = render(<AssistantIdentity tenantId="1" />);
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        const input = container.querySelector('input[type="file"]');
        expect(input).toBeTruthy();
        fireEvent.change(input!, { target: { files: [new File([artwork], name, { type })] } });
        await waitFor(() => expect(container.querySelector('.ant-upload img')?.getAttribute('src')).toMatch(prefix));
        fireEvent.click(screen.getByText('card.edit.save'));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0].theming.assistantIcon).toMatch(prefix);
    });
    it('clears overrides with null so platform identity is inherited again', async () => {
        render(<AssistantIdentity tenantId="1" />);
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.change(screen.getByLabelText('settings.assistant.name'), { target: { value: '' } });
        fireEvent.click(screen.getByLabelText('settings.assistant.inherit'));
        fireEvent.click(screen.getByText('card.edit.save'));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0]).toEqual({ theming: { assistantName: null, assistantIcon: null } });
    });
    it('shows a raw-read failure and prevents editing unverified inherited values', () => {
        fixtures.readError = true;
        render(<AssistantIdentity tenantId="1" />);
        expect(screen.getByRole('alert')).toHaveTextContent('settings.assistant.loadError');
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
        expect(screen.getByLabelText('settings.assistant.name')).toBeDisabled();
    });
    it('keeps a restricted Appearance card read-only', () => {
        const { container } = render(<AssistantIdentity tenantId="1" readOnly />);
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
        expect(container.querySelector('input[type="file"]')).toBeDisabled();
    });
});
