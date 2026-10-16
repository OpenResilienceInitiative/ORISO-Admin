// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeneralSettings } from './index';

const fixtures = vi.hoisted(() => ({ isSuperAdmin: false, appearanceAllowed: true }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../CardDeck', () => ({
    CardDeck: Object.assign(({ children }: { children?: React.ReactNode }) => <ul>{children}</ul>, {
        Item: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
    }),
}));
vi.mock('../../CardEditable', () => ({ CardEditable: () => <div data-testid="master-data-toggle-card" /> }));
vi.mock('../../FormSwitchField', () => ({ FormSwitchField: () => null }));
vi.mock('./components/AssistantIdentity', () => ({ AssistantIdentity: () => <div data-testid="assistant" /> }));
vi.mock('./components/Languages', () => ({ Languages: () => <div data-testid="languages" /> }));
vi.mock('./components/LogoAndFavicon', () => ({ LogoAndFavicon: () => <div data-testid="logo" /> }));
vi.mock('./components/NameAndSlogan', () => ({ NameAndSlogan: () => <div data-testid="name" /> }));
vi.mock('./components/ThemeBuilder', () => ({ ThemeBuilder: () => <div data-testid="theme" /> }));
vi.mock('./components/TypeOfLanguage', () => ({ TypeOfLanguage: () => <div data-testid="type-of-language" /> }));
vi.mock('./components/ClosingAnimation', () => ({
    ClosingAnimation: ({ tenantId, readOnly }: { tenantId: string; readOnly?: boolean }) => (
        <div data-testid="closing-animation" data-tenant={tenantId} data-readonly={String(!!readOnly)} />
    ),
}));
vi.mock('../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: { tenantAdminControls: { allowedPermissionToggles: { appearance: fixtures.appearanceAllowed } } },
        setManualSettings: vi.fn(),
    }),
}));
vi.mock('../../../hooks/useSettingsAdminMutation.hook', () => ({
    useSettingsAdminMutation: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: { id: 7 } }) }));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ isSuperAdmin: fixtures.isSuperAdmin }) }));

afterEach(() => {
    cleanup();
    fixtures.isSuperAdmin = false;
    fixtures.appearanceAllowed = true;
});

describe('GeneralSettings cards', () => {
    it('shows the closing-animation card on the Appearance tab, for the edited tenant', () => {
        render(<GeneralSettings tenantId="3" section="appearance" />);
        expect(screen.getByTestId('closing-animation')).toHaveAttribute('data-tenant', '3');
    });

    it('shows it once in the combined deck', () => {
        render(<GeneralSettings tenantId="3" />);
        expect(screen.getAllByTestId('closing-animation')).toHaveLength(1);
    });

    it('keeps it off the master-data tab', () => {
        render(<GeneralSettings tenantId="3" section="masterData" />);
        expect(screen.queryByTestId('closing-animation')).toBeNull();
    });

    it('places it right after the assistant card', () => {
        render(<GeneralSettings tenantId="3" section="appearance" />);
        const ids = screen.getAllByTestId(/.+/).map((node) => node.getAttribute('data-testid'));
        expect(ids.indexOf('closing-animation')).toBe(ids.indexOf('assistant') + 1);
    });

    it('is read-only for a tenant admin who may not edit the appearance', () => {
        fixtures.appearanceAllowed = false;
        render(<GeneralSettings tenantId="3" section="appearance" />);
        expect(screen.getByTestId('closing-animation')).toHaveAttribute('data-readonly', 'true');
    });

    it('stays editable for a platform admin even when tenant admins may not edit', () => {
        fixtures.appearanceAllowed = false;
        fixtures.isSuperAdmin = true;
        render(<GeneralSettings tenantId="3" section="appearance" />);
        expect(screen.getByTestId('closing-animation')).toHaveAttribute('data-readonly', 'false');
    });
});
