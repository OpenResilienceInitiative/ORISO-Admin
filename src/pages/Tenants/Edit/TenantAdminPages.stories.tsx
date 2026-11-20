import type { Meta, StoryObj } from '@storybook/react-vite';
import { UserRole } from '../../../enums/UserRole';
import { TENANT_DATA_KEY } from '../../../hooks/useTenantData.hook';
import { setStoryAuth, withSeededAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { GeneralSettingsPage } from '../../TenantSettings/GeneralSettings';
import { LegalSettingsPage } from '../../TenantSettings/LegalSettings';
import { UnifiedSmtpSettingsPage } from '../../TenantSettings/UnifiedSmtpSettings';
import { SchemeFromUrl, storyTenant, tenantEditHandlers } from './tenantEditStoryHarness';

/**
 * The same tiles as the platform admin sees under `/admin/tenants/:id/...`, but as the Träger admin's own
 * pages (`/admin/theme-settings/...`): same components, own page wrappers and role. Check each at 1440 and 390.
 */
const meta = {
    title: 'Admin/Tenant/Träger admin',
    parameters: { layout: 'fullscreen', msw: { handlers: tenantEditHandlers } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const asTraegerAdmin = (page: () => React.ReactElement) =>
    function TraegerAdminDecorator() {
        setStoryAuth([UserRole.TenantAdmin], storyTenant.id);
        return withSeededAdminProviders(
            () => (
                <SchemeFromUrl>
                    <div style={{ padding: 24 }}>{page()}</div>
                </SchemeFromUrl>
            ),
            (client) => {
                client.setQueryData([TENANT_DATA_KEY, storyTenant.id], storyTenant);
            },
        );
    };

export const MasterData: Story = { decorators: [asTraegerAdmin(() => <GeneralSettingsPage section="masterData" />)] };

/**
 * Without the permission to edit, the upload tiles are inactive; their grey "Hinzufügen" label is the disabled
 * state, which WCAG 1.4.3 exempts from the contrast minimum (axe cannot tell a disabled div from text).
 */
export const Appearance: Story = {
    decorators: [asTraegerAdmin(() => <GeneralSettingsPage section="appearance" />)],
    parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
};

export const Legal: Story = { decorators: [asTraegerAdmin(() => <LegalSettingsPage />)] };

export const EmailServer: Story = { decorators: [asTraegerAdmin(() => <UnifiedSmtpSettingsPage />)] };
