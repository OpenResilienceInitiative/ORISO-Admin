import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminAddon } from '../../addons/addonTypes';
import { AddonInfo } from './AddonInfo';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'de', language: 'de' } }),
}));

const mutate = vi.hoisted(() => vi.fn());
vi.mock('./useAddons', () => ({
    useSetGlobalEnabled: () => ({ mutate, isPending: false }),
}));

const addon = (enabled: boolean): AdminAddon => ({
    manifest: {
        name: 'digisucht-tools',
        version: '0.1.0',
        contract: 'oriso-addon/v1',
        apps: [{ id: 'goals', title: { de: 'Ziele' }, slots: ['asker.navigation'] }],
    },
    global: { enabled },
    tenantId: 0,
    enabled: false,
    agencyOverrides: [],
});

beforeEach(() => mutate.mockReset());

describe('AddonInfo', () => {
    it('shows the add-on, its apps and the global state', () => {
        render(<AddonInfo addon={addon(false)} isSuperAdmin />);
        expect(screen.getByText('digisucht-tools')).toBeInTheDocument();
        expect(screen.getByText('Ziele')).toBeInTheDocument();
        expect(screen.getByText('addons.global.off')).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: 'addons.global.switchLabel' })).not.toBeChecked();
    });

    it('lets a SuperAdmin switch the add-on on globally right away', () => {
        render(<AddonInfo addon={addon(false)} isSuperAdmin />);
        fireEvent.click(screen.getByRole('switch', { name: 'addons.global.switchLabel' }));
        expect(mutate).toHaveBeenCalledWith(true, expect.anything());
    });

    it('asks before switching the add-on off globally', async () => {
        render(<AddonInfo addon={addon(true)} isSuperAdmin />);
        fireEvent.click(screen.getByRole('switch', { name: 'addons.global.switchLabel' }));
        expect(mutate).not.toHaveBeenCalled();
        fireEvent.click(await screen.findByText('addons.global.confirmOffOk'));
        await waitFor(() => expect(mutate).toHaveBeenCalledWith(false, expect.anything()));
    });

    it('shows a Träger admin the global switch read-only', () => {
        render(<AddonInfo addon={addon(true)} isSuperAdmin={false} />);
        const toggle = screen.getByRole('switch', { name: 'addons.global.switchLabel' });
        expect(toggle).toBeDisabled();
        expect(toggle).toHaveAccessibleDescription('addons.global.readOnly');
    });
});
