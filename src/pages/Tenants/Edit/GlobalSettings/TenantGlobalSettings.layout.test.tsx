import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vite-plus/test';
import { TenantGlobalSettings } from './index';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../components/Tenants/AppSettings/PermissionsSettings/TenantPermissionsSettings', () => ({
    TenantPermissionsSettings: () => <div data-testid="permissions" />,
}));

describe('TenantGlobalSettings layout', () => {
    it('has no horizontal gutter, so the page is not wider than its host (no sideways scroll)', () => {
        const { container } = render(
            <MemoryRouter>
                <TenantGlobalSettings />
            </MemoryRouter>,
        );
        const row = container.querySelector<HTMLElement>('.ant-row');

        expect(row).not.toBeNull();
        // An antd Row with a horizontal gutter sets negative side margins on itself.
        expect(row?.getAttribute('style') ?? '').not.toMatch(/margin/);
    });
});
