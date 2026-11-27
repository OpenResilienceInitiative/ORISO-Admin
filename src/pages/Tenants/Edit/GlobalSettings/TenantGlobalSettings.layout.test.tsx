import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vite-plus/test';
import { TenantGlobalSettings } from './index';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../components/Tenants/AppSettings/PermissionsSettings/TenantPermissionsSettings', () => ({
    TenantPermissionsSettings: () => <div data-testid="permissions" />,
}));

describe('TenantGlobalSettings layout', () => {
    it('has no antd Row around the tiles, whose gutter made the page wider than its host (sideways scroll)', () => {
        const { container } = render(
            <MemoryRouter>
                <TenantGlobalSettings />
            </MemoryRouter>,
        );

        expect(container.querySelector('[data-testid="permissions"]')).not.toBeNull();
        expect(container.querySelector('.ant-row')).toBeNull();
    });
});
