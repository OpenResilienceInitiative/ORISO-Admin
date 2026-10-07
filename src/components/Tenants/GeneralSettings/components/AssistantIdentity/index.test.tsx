// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistantIdentity } from './index';

const save = vi.fn();
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../hooks/useTenantAppearanceFormData', () => ({
    useTenantAppearanceFormData: () => ({
        data: {
            name: 'Tenant one',
            theming: { assistantName: 'Carimat', assistantIcon: 'default', primaryColor: '#a5000a' },
        },
        isLoading: false,
        mutate: save,
    }),
}));
vi.mock('../../../../../hooks/usePublicTenantData.hook', () => ({ usePublicTenantData: () => ({ data: undefined }) }));
vi.mock('../../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { serverSettingsMeta: undefined } }),
}));
afterEach(() => {
    cleanup();
    save.mockClear();
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

    it('saves the default identity without a broken upload preview', async () => {
        const { container } = render(<AssistantIdentity tenantId="1" />);
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        expect(container.querySelector('.ant-upload img')).toBeNull();
        fireEvent.click(screen.getByText('card.edit.save'));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0].theming.assistantIcon).toBe('default');
    });
    it.each([
        ['image/png', 'custom.png', 'PNG', /^data:image\/png;base64,/],
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
    it('keeps a restricted Appearance card read-only', () => {
        const { container } = render(<AssistantIdentity tenantId="1" readOnly />);
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
        expect(container.querySelector('input[type="file"]')).toBeDisabled();
    });
});
