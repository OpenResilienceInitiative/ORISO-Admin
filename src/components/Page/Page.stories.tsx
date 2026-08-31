import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '../Card';
import { CardDeck } from '../CardDeck';
import { Page } from './index';

/**
 * In the app the page sits right of the 128px admin sidebar, and the header's
 * arrow rail reaches into that gutter. Without the stand-in the backward arrow
 * would fall off the left edge of the Storybook canvas and the rail could not be
 * reviewed at all.
 */
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

/**
 * The card-deck navigation in its final home: the arrows sit in the page header
 * flanking the tab row (Figma 1285-80496), not in a sticky footer under the
 * cards where they used to collide with the cards' own footer actions.
 * The deck registers itself through `CardDeckNavContext` — scroll the deck and
 * the header arrows flip between enabled and disabled.
 */
export const WithCardDeck: Story = {
    render: () => (
        <Page>
            <Page.Title
                tabs={[
                    { to: '/admin/settings/global', titleKey: 'Globale Konfigurationen', iconName: 'global_config' },
                    { to: '/admin/settings/appearance', titleKey: 'Erscheinungsbild', iconName: 'appearance' },
                    { to: '/admin/settings/legal', titleKey: 'Rechtliches', iconName: 'legal' },
                    { to: '/admin/settings/email', titleKey: 'Email Server', iconName: 'email_server' },
                ]}
            />
            <CardDeck
                ariaLabel="Rechtliches"
                previousLabel="Vorherige Karte anzeigen"
                nextLabel="Weitere Karte anzeigen"
            >
                {['Trägerspezifische Datenschutzerklärung', 'Vertragsunterlagen', 'Datenschutzerklärung'].map(
                    (title) => (
                        <CardDeck.Item key={title}>
                            <Card titleKey={title}>Karteninhalt mit eigenen Footer-Aktionen.</Card>
                        </CardDeck.Item>
                    ),
                )}
            </CardDeck>
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
