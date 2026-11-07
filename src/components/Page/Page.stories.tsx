import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import { Card } from '../Card';
import { CardGrid } from '../CardGrid';
import { Page } from './index';

/** In the app the page sits right of the 128px admin sidebar. */
const SidebarStandIn = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
        <div
            style={{
                width: 128,
                flex: '0 0 128px',
                background: 'var(--m3-on-background, #281715)',
            }}
            aria-hidden
        />
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>{children}</div>
    </div>
);

const meta = {
    title: 'Organisms/Page',
    component: Page,
    parameters: { layout: 'fullscreen' },
    decorators: [(Story) => <SidebarStandIn>{Story()}</SidebarStandIn>],
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

const SampleContent = () => (
    <div style={{ padding: 24 }}>
        <p>Page content goes here.</p>
    </div>
);

/** The page shell that wraps every admin route (sticky header + scrollable content). */
export const Default: Story = {
    render: () => (
        <Page>
            <SampleContent />
        </Page>
    ),
};

/** Loading state — renders an antd spinner instead of the content. */
export const Loading: Story = {
    render: () => <Page isLoading />,
};

/** With a back header (`Page.Back`) linking to a parent route. */
export const WithBackHeader: Story = {
    render: () => (
        <Page>
            <Page.Back path="/admin/users" title="Max Mustermann" />
            <SampleContent />
        </Page>
    ),
};

/** A back header with a tab bar (`Page.Back` + tabs) — tabs only show when there is more than one. */
export const WithTabs: Story = {
    render: () => (
        <Page>
            <Page.Back
                path="/admin/tenants"
                title="Beispiel-Mandant"
                tabs={[
                    { to: '/admin/tenants/1/general', titleKey: 'tenant.tabs.master_data', iconName: 'master_data' },
                    { to: '/admin/tenants/1/legal', titleKey: 'tenant.tabs.legal', iconName: 'legal' },
                ]}
            />
            <SampleContent />
        </Page>
    ),
};

/** Issue #193: the header must reveal the final tab even without a card deck. */
const SETTINGS_TABS = [
    { to: '/admin/theme-settings/global-config', titleKey: 'Konfiguration', iconName: 'global_config' },
    { to: '/admin/theme-settings/master-data', titleKey: 'Stammdaten', iconName: 'master_data' },
    { to: '/admin/theme-settings/general', titleKey: 'Erscheinungsbild', iconName: 'appearance' },
    { to: '/admin/theme-settings/legal', titleKey: 'Rechtliches', iconName: 'legal' },
    { to: '/admin/theme-settings/smtp', titleKey: 'E-Mail-Server', iconName: 'email_server' },
    { to: '/admin/theme-settings/notices', titleKey: 'Systemhinweise' },
    { to: '/admin/theme-settings/function-access', titleKey: 'Funktionszugriff', iconName: 'functionality_access' },
];

/**
 * Seven tabs, the most a settings page has, in the shared underline tab bar (ORISO-Admin#1374).
 * When the bar is narrower than its tabs it scrolls inside itself; the page never scrolls sideways.
 */
export const SevenSettingsTabs: Story = {
    render: () => (
        <Page>
            <Page.Title tabs={SETTINGS_TABS} />
            <CardGrid raster>
                {['Impressum', 'Datenschutzerklärung', 'Vertragsunterlagen', 'Einwilligung'].map((title) => (
                    <CardGrid.Item key={title}>
                        <Card titleKey={title} variant="dialog">
                            Karteninhalt.
                        </Card>
                    </CardGrid.Item>
                ))}
            </CardGrid>
        </Page>
    ),
    play: async ({ canvasElement }) => {
        const tabs = canvasElement.querySelector<HTMLElement>('[data-admin-page-tabs]');
        await expect(tabs).not.toBeNull();
        // The bar may scroll inside itself, but it never widens the page.
        await expect(tabs!.scrollWidth).toBeLessThanOrEqual(tabs!.clientWidth);
        await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(
            canvasElement.ownerDocument.documentElement.clientWidth,
        );
        await expect(canvasElement.querySelector('[data-admin-page-deck-nav]')).toBeNull();
    },
};
