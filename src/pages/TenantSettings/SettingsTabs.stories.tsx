import type { Meta, StoryObj } from '@storybook/react-vite';
import { Page } from '../../components/Page';
import { getSettingsTabs } from '../../constants/settingsTabs';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';

/**
 * The settings tab bar per admin level.
 *
 * Both stories render the output of the real `getSettingsTabs` resolver, so they are a visual
 * contract against the design (Figma `Admin.ORISO` node 465-27854) rather than a hand-written
 * mock that can drift from production — the tenant level lost its `Erscheinungsbild` tab exactly
 * that way (ORISO-Admin#58).
 */
const meta = {
    title: 'Organisms/SettingsTabs',
    component: Page,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

const allowAll = () => true;

/** Level 1 — platform admin: Globale Konfigurationen · Stammdaten · Erscheinungsbild · Rechtliches · Email Server · Funktionszugriff. */
export const PlatformAdminLevel: Story = {
    render: () => (
        <Page>
            <Page.Title
                titleKey="settings.title"
                subTitleKey="settings.title.text"
                tabs={getSettingsTabs({
                    isSuperAdmin: true,
                    shouldShowThemeSettings: true,
                    can: allowAll,
                    isTenantSettingsEditEnabled: true,
                    multitenancyWithSingleDomainEnabled: false,
                })}
            />
        </Page>
    ),
};

/** Level 2 — Träger admin: Stammdaten & Mehr · Erscheinungsbild · Rechtliches · Email Server · Funktionszugriff (+ Funktionalitäten). */
export const TenantAdminLevel: Story = {
    render: () => (
        <Page>
            <Page.Title
                titleKey="settings.title"
                subTitleKey="settings.title.text"
                tabs={getSettingsTabs({
                    isSuperAdmin: false,
                    shouldShowThemeSettings: true,
                    can: allowAll,
                    isTenantSettingsEditEnabled: true,
                    multitenancyWithSingleDomainEnabled: false,
                })}
            />
        </Page>
    ),
};

/** Level 2 without the tenant feature toggles — the pure designed set of five tabs. */
export const TenantAdminLevelWithoutFeatureToggles: Story = {
    render: () => (
        <Page>
            <Page.Title
                titleKey="settings.title"
                subTitleKey="settings.title.text"
                tabs={getSettingsTabs({
                    isSuperAdmin: false,
                    shouldShowThemeSettings: true,
                    can: (action: PermissionAction | PermissionAction[], resource: Resource) =>
                        resource === Resource.Tenant || resource === Resource.LegalText || Boolean(action),
                    isTenantSettingsEditEnabled: false,
                    multitenancyWithSingleDomainEnabled: false,
                })}
            />
        </Page>
    ),
};
