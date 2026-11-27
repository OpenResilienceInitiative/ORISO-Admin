import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import { AdminSegmentedTabs, type AdminSegmentedTabItem } from '../AdminSegmentedTabs/AdminSegmentedTabs';
import { BackButton, type BackButtonVariant } from '../BackButton';
import { SchemeScope, type StoryScheme } from '../BackButton/storyFixtures';
import { Card } from '../Card';
import { CardGrid } from '../CardGrid';
import { TileSections } from '../TileSections';
import { Page, tabIcons } from './index';

/*
 * The header of a sub page, old and new, on the same page with the same tile underneath.
 *
 * "Before" is the real `Page.Back` as it ships. "After" is the target geometry, built here from
 * the real parts (BackButton, AdminSegmentedTabs, Card, TileSections), because the BackButton
 * is not wired into `Page.Back` yet.
 *
 * The raster: one left edge for back button, title, tab bar and tile (the content edge), 16px
 * between the four rows.
 */

type StoryArgs = {
    scheme?: StoryScheme;
    title?: string;
    parentLabel?: string;
};

const SidebarStandIn = ({ children }: { children: ReactNode }) => {
    const isDesktop = useIsDesktopLayout();

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {isDesktop && (
                <div
                    style={{ width: 128, flex: '0 0 128px', background: 'var(--m3-on-background, #281715)' }}
                    aria-hidden
                />
            )}
            <div style={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', minWidth: 0 }}>{children}</div>
        </div>
    );
};

const TABS: Array<{ to: string; label: string; iconName: keyof typeof tabIcons }> = [
    { to: '/admin/tenants/1/general', label: 'Stammdaten', iconName: 'master_data' },
    { to: '/admin/tenants/1/legal', label: 'Rechtliches', iconName: 'legal' },
    { to: '/admin/tenants/1/appearance', label: 'Erscheinungsbild', iconName: 'appearance' },
    { to: '/admin/tenants/1/smtp', label: 'E-Mail-Server', iconName: 'email_server' },
];

const FirstTile = () => (
    <CardGrid raster>
        <CardGrid.Item>
            <Card titleKey="Rechtliches" variant="dialog">
                <TileSections>
                    <TileSections.Section id="imprint" title="Impressum" note="Pflichtangaben für alle Seiten.">
                        Karteninhalt.
                    </TileSections.Section>
                    <TileSections.Section id="privacy" title="Datenschutzerklärung" note="Gilt für die Beratung.">
                        Karteninhalt.
                    </TileSections.Section>
                </TileSections>
            </Card>
        </CardGrid.Item>
    </CardGrid>
);

/** Stand-in for the mobile bottom bar: the back button lives here, icon only. */
const MobileBarStandIn = ({ parentLabel }: { parentLabel: string }) => (
    <div
        style={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            marginTop: 'auto',
            background: 'var(--m3-surface-container, #f0edee)',
        }}
    >
        <BackButton iconOnly label={parentLabel} to="/admin/tenants" />
        <span
            aria-hidden
            style={{ flex: 1, height: 40, borderRadius: 20, background: 'var(--m3-surface-container-high, #eae7e8)' }}
        />
    </div>
);

const ROW_GAP = 16;

const ProposedPage = ({
    variant,
    title,
    parentLabel,
}: {
    variant: BackButtonVariant;
    title: string;
    parentLabel: string;
}) => {
    const isDesktop = useIsDesktopLayout();
    const items: AdminSegmentedTabItem[] = TABS.map(({ to, label, iconName }) => {
        const Icon = tabIcons[iconName];
        return { id: to, to, label, icon: <Icon /> };
    });
    const edge = isDesktop ? 'var(--admin-content-inset, 24px)' : 6;
    const backLabel = variant === 'breadcrumb' ? parentLabel : `Zurück zu ${parentLabel}`;

    return (
        <div
            style={
                {
                    display: 'flex',
                    flex: '1 1 auto',
                    flexDirection: 'column',
                    padding: `0 ${typeof edge === 'number' ? `${edge}px` : edge}`,
                    // The tab bar is already on the content edge, so it takes no extra inset.
                    '--admin-subnav-inset': '0px',
                } as CSSProperties
            }
        >
            {isDesktop && (
                <header
                    data-admin-page-header
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: ROW_GAP,
                        // Top: the same 24px the other pages have above their tab bar. Bottom: the 16px row gap.
                        padding: `var(--admin-header-pad, 24px) 0 ${ROW_GAP}px`,
                    }}
                >
                    <BackButton
                        variant={variant}
                        label={backLabel}
                        to="/admin/tenants"
                        current={title}
                        trailLabel="Seitenpfad"
                    />
                    <h1
                        className="m3-headline-small"
                        data-story-title
                        style={{
                            margin: 0,
                            minWidth: 0,
                            overflowWrap: 'anywhere',
                            color: 'var(--m3-on-surface, #1b1b1c)',
                        }}
                    >
                        {title}
                    </h1>
                    <div data-admin-page-tabs style={{ display: 'flex', alignSelf: 'stretch', minWidth: 0 }}>
                        <AdminSegmentedTabs ariaLabel={title} items={items} activeId={TABS[1].to} />
                    </div>
                </header>
            )}
            <div data-story-tiles style={{ paddingTop: isDesktop ? 0 : 6, paddingBottom: 64 }}>
                <FirstTile />
            </div>
            {!isDesktop && <MobileBarStandIn parentLabel={`Zurück zu ${parentLabel}`} />}
        </div>
    );
};

const meta = {
    title: 'Organisms/Page header',
    parameters: { layout: 'fullscreen' },
    argTypes: { scheme: { control: 'inline-radio', options: ['light', 'inverted'] } },
    args: { scheme: 'light', title: 'Beispiel-Mandant', parentLabel: 'Träger' },
    decorators: [
        (Story, context) => (
            <SchemeScope scheme={context.args.scheme} minHeight="100vh">
                <SidebarStandIn>
                    <Story />
                </SidebarStandIn>
            </SchemeScope>
        ),
    ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Today: the dark-red oval sits on the sidebar edge, the tabs hang beside it, the tile starts 40px below. */
export const Before: Story = {
    render: ({ title }) => (
        <Page>
            <Page.Back
                path="/admin/tenants"
                title={title}
                tabs={TABS.map(({ to, label, iconName }) => ({ to, titleKey: label, iconName }))}
            />
            <div data-story-tiles>
                <FirstTile />
            </div>
        </Page>
    ),
};

/** A — round neutral button: "Zurück zu Träger". */
export const AfterTonal: Story = {
    render: ({ title, parentLabel }) => <ProposedPage variant="tonal" title={title!} parentLabel={parentLabel!} />,
    play: async ({ canvasElement }) => {
        // On a phone the header is not drawn: the back button lives in the bottom bar.
        if (!canvasElement.querySelector('[data-admin-page-header]')) return;
        const rect = (selector: string) => canvasElement.querySelector(selector)!.getBoundingClientRect();
        const back = rect('[data-admin-back-button]');
        const tabs = rect('[data-admin-page-tabs]');
        const tile = rect('[data-story-tiles]');
        const title = rect('[data-story-title]');
        // One left edge for the four rows.
        await expect(back.left).toBeCloseTo(tabs.left, 0);
        await expect(tile.left).toBeCloseTo(tabs.left, 0);
        await expect(title.left).toBeCloseTo(tabs.left, 0);
        // 16px between the rows.
        await expect(title.top - back.bottom).toBeCloseTo(16, 0);
        await expect(tabs.top - title.bottom).toBeCloseTo(16, 0);
        await expect(tile.top - tabs.bottom).toBeCloseTo(16, 0);
    },
};

/** B — text button with a leading chevron. */
export const AfterText: Story = {
    render: ({ title, parentLabel }) => <ProposedPage variant="text" title={title!} parentLabel={parentLabel!} />,
};

/** C — breadcrumb. */
export const AfterBreadcrumb: Story = {
    render: ({ title, parentLabel }) => <ProposedPage variant="breadcrumb" title={title!} parentLabel={parentLabel!} />,
};

/** A long Träger name and a long entity name: nothing breaks, nothing scrolls sideways. */
export const AfterLongNames: Story = {
    args: {
        title: 'Beratungsstelle für Eltern, Kinder und Jugendliche der Diakonie Mitteldeutschland e. V., Standort Halle (Saale)',
        parentLabel:
            'Träger-Verwaltung für Beratungsstellen der Diakonie Mitteldeutschland e. V. (Landesverband Sachsen-Anhalt)',
    },
    render: ({ title, parentLabel }) => <ProposedPage variant="tonal" title={title!} parentLabel={parentLabel!} />,
    play: async ({ canvasElement }) => {
        const root = canvasElement.ownerDocument.documentElement;
        await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    },
};
