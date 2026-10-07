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
    it('keeps a restricted Appearance card read-only', () => {
        const { container } = render(<AssistantIdentity tenantId="1" readOnly />);
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
        expect(container.querySelector('input[type="file"]')).toBeDisabled();
    });
});
