import { useEffect, useState, type ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useLocation, useNavigate } from 'react-router-dom';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import routePathNames from '../../../appConfig';
import { Resource } from '../../../enums/Resource';
import { UserRole } from '../../../enums/UserRole';
import i18n from '../../../i18n';
import { applyAdminTheme } from '../../../utils/applyAdminTheme';
import type { AdminSidebarNavItem } from '../AdminSidebar';
import { buildAdminNavItems } from '../adminNavItems';
import { canFor, hasRoleFor } from '../adminNavFixtures';
import { activeNavIconFor } from '../NavIcon';
import { SectionTabIdentity } from './SectionTabIdentity';
import {
    buildSectionTabIconSvg,
    measureGlyphBox,
    readSectionTabColors,
    svgToPngDataUrl,
    toSvgDataUrl,
    type SectionTabColors,
} from './sectionTabIcon';

/**
 * Every admin section's browser tab icon: the glyph the sidebar shows for that section, in the
 * theme's on-primary colour on a tile in the theme's primary colour (the Träger colours). Shown
 * at tile size and at the 32 px / 16 px a tab strip uses, plus the PNG fallback Safari takes, and
 * a tab mock with only the section name.
 */

/** Two Träger with different brand colours, run through the real admin theme logic. */
const TENANTS = {
    caritas: { name: 'Träger A (#A5000A)', primaryColor: '#A5000A' },
    blue: { name: 'Träger B (#1C4F8F)', primaryColor: '#1C4F8F' },
} as const;
type TenantKey = keyof typeof TENANTS;

const label = (key: string) => i18n.t(key);
const buildSections = (): AdminSidebarNavItem[] => [
    ...buildAdminNavItems({
        isSuperAdmin: true,
        hasRole: hasRoleFor(UserRole.TenantAdmin),
        can: canFor(...(Object.values(Resource) as Resource[])),
        labels: {
            account: label('sidebar.account'),
            agency: label('sidebar.agency'),
            home: label('sidebar.home'),
            links: label('sidebar.links'),
            logs: label('sidebar.logs'),
            settings: label('sidebar.settings'),
            statistics: label('sidebar.statistics'),
            tenants: label('sidebar.tenants'),
            users: label('sidebar.users'),
        },
        settingsPath: routePathNames.themeSettings,
    }),
    {
        key: 'account',
        to: routePathNames.userProfile,
        label: label('sidebar.account'),
        iconPath: routePathNames.userProfile,
    },
];

/** The tokens `applyAdminTheme` derives for a Träger, read back like the live tab does. */
const tenantColors = (tenant: TenantKey): SectionTabColors => {
    const probe = document.createElement('div');
    applyAdminTheme({ primaryColor: TENANTS[tenant].primaryColor }, probe);
    return readSectionTabColors(probe);
};

const IconRow = ({ item, colors }: { item: AdminSidebarNavItem; colors: SectionTabColors }) => {
    const Icon = activeNavIconFor(item.iconPath) as ComponentType<object>;
    const box = measureGlyphBox(Icon);
    // Frank: the real tab icon (16–32 px) gets little padding; the 64 px preview more air.
    const svg = buildSectionTabIconSvg(Icon, colors, { fit: 'tab', box });
    const large = buildSectionTabIconSvg(Icon, colors, { fit: 'large', box });
    const href = toSvgDataUrl(svg);
    const [png, setPng] = useState<string | null>(null);
    useEffect(() => {
        let current = true;
        svgToPngDataUrl(svg).then((url) => current && setPng(url));
        return () => {
            current = false;
        };
    }, [svg]);

    return (
        <li
            data-testid="section-tab-icon"
            data-route={item.to}
            data-svg={svg}
            data-svg-large={large}
            style={{ display: 'contents' }}
        >
            <span style={{ fontWeight: 600 }}>{item.label}</span>
            <code style={{ fontSize: 12 }}>{item.to}</code>
            <img src={toSvgDataUrl(large)} width={64} height={64} alt={`${item.label} 64`} />
            <img src={href} width={32} height={32} alt={`${item.label} 32`} />
            <img src={href} width={16} height={16} alt={`${item.label} 16`} />
            {png ? (
                <img src={png} width={32} height={32} alt={`${item.label} PNG`} data-testid="section-tab-icon-png" />
            ) : (
                <span />
            )}
            <span
                data-testid="tab-mock"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: '8px 8px 0 0',
                    background: '#dfe1e5',
                    color: '#1f1f1f',
                    font: '12px system-ui, sans-serif',
                    width: 200,
                }}
            >
                <img src={href} width={16} height={16} alt="" />
                {item.label}
            </span>
        </li>
    );
};

const TenantGallery = ({ tenant }: { tenant: TenantKey }) => {
    const colors = tenantColors(tenant);
    return (
        <section data-testid="tenant-gallery" data-tenant={tenant} style={{ marginBottom: 24 }}>
            <h3 style={{ font: '600 15px system-ui, sans-serif', margin: '0 0 8px' }}>
                {TENANTS[tenant].name} — primary <code>{colors.tile}</code>, on-primary <code>{colors.glyph}</code>
            </h3>
            <ul
                style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, max-content)',
                    alignItems: 'center',
                    gap: '10px 18px',
                    font: '14px system-ui, sans-serif',
                }}
            >
                {buildSections().map((item) => (
                    <IconRow key={item.key} item={item} colors={colors} />
                ))}
            </ul>
        </section>
    );
};

const Gallery = ({ tenants }: { tenants: TenantKey[] }) => (
    <div style={{ padding: 16 }}>
        {tenants.map((tenant) => (
            <TenantGallery key={tenant} tenant={tenant} />
        ))}
    </div>
);

const meta: Meta<typeof Gallery> = {
    title: 'Components/Layout/SectionTabIcon',
    component: Gallery,
    args: { tenants: ['caritas', 'blue'] },
};
export default meta;
type Story = StoryObj<typeof Gallery>;

const SECTION_ROUTES = [
    routePathNames.home,
    routePathNames.themeSettings,
    routePathNames.tenants,
    routePathNames.agency,
    routePathNames.tenantAdmins,
    routePathNames.statistic,
    routePathNames.links,
    routePathNames.caseHandoverLogs,
    routePathNames.userProfile,
];

const attr = (svg: string, selector: string, name: string) =>
    new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector(selector)?.getAttribute(name);

/** Both Träger, every section: the real sidebar glyph, tile = primary, glyph = on-primary. */
export const TwoTenants: Story = {
    play: async ({ canvasElement }) => {
        const galleries = within(canvasElement).getAllByTestId('tenant-gallery');
        await expect(galleries.map((gallery) => gallery.dataset.tenant)).toEqual(['caritas', 'blue']);
        const expected = (['caritas', 'blue'] as TenantKey[]).map(tenantColors);
        await expect(expected[0].tile).not.toBe(expected[1].tile);

        const seen = galleries.map((gallery, index) => {
            const colors = expected[index];
            const rows = within(gallery).getAllByTestId('section-tab-icon');
            return {
                routes: rows.map((row) => row.dataset.route),
                // Every icon: tile = primary, glyph = on-primary, and the real glyph path from the
                // navbar SVG file (not a stub).
                drawn: rows.every((row) => {
                    const svg = row.dataset.svg ?? '';
                    return (
                        attr(svg, 'rect', 'fill') === colors.tile &&
                        attr(svg, 'g.glyph', 'fill') === colors.glyph &&
                        svg.includes(`{fill:${colors.glyph}}`) &&
                        (attr(svg, 'g.glyph svg path', 'd')?.length ?? 0) > 40
                    );
                }),
                // Ink measured in the browser: tab = 46/64, large = 38/64, never an added stroke.
                fits: rows.every((row) => {
                    const tab = row.dataset.svg ?? '';
                    const large = row.dataset.svgLarge ?? '';
                    return (
                        attr(tab, 'g.glyph svg', 'width') === '46' &&
                        !tab.includes('stroke') &&
                        attr(large, 'g.glyph svg', 'width') === '38' &&
                        !large.includes('stroke')
                    );
                }),
                // Tab mock: only the section name, no platform name.
                tabs: within(gallery)
                    .getAllByTestId('tab-mock')
                    .map((mock) => mock.textContent),
            };
        });
        const labels = buildSections().map((item) => item.label);
        await expect(seen).toEqual([
            { routes: SECTION_ROUTES, drawn: true, fits: true, tabs: labels },
            { routes: SECTION_ROUTES, drawn: true, fits: true, tabs: labels },
        ]);
        await expect(labels.some((text) => text.includes('Admin'))).toBe(false);
        await waitFor(() => expect(within(canvasElement).getAllByTestId('section-tab-icon-png')).toHaveLength(18));
    },
};

const tabIconHref = () =>
    document.querySelector<HTMLLinkElement>("link[rel~='icon']:not([data-section-icon-png])")?.getAttribute('href') ??
    '';
const tabSvg = () => decodeURIComponent(tabIconHref().slice('data:image/svg+xml,'.length));

const LiveControls = ({ sections }: { sections: AdminSidebarNavItem[] }) => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    return (
        <div style={{ padding: 16, font: '14px system-ui, sans-serif' }}>
            <p>
                This page&apos;s own browser tab follows the section below. Open the story on its own (iframe) to see it
                in the tab strip.
            </p>
            <p>
                Route: <code data-testid="live-route">{pathname}</code>
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {sections.map((item) => (
                    <button key={item.key} type="button" onClick={() => navigate(item.to)}>
                        {item.label}
                    </button>
                ))}
                <button type="button" onClick={() => navigate(routePathNames.login)}>
                    No section (login)
                </button>
                {(Object.keys(TENANTS) as TenantKey[]).map((tenant) => (
                    <button
                        key={tenant}
                        type="button"
                        onClick={() => applyAdminTheme({ primaryColor: TENANTS[tenant].primaryColor })}
                    >
                        Theme: {TENANTS[tenant].name}
                    </button>
                ))}
            </div>
        </div>
    );
};

/** The default `<title>` and five icon links `index.html` declares. */
const withIndexHtmlHead = (Story: ComponentType) => {
    if (!document.querySelector('link[data-section-icon]')) {
        document.querySelectorAll("link[rel~='icon']").forEach((link) => link.remove());
        [
            ['/favicon.ico'],
            ['/android-icon-192x192.png', '192x192'],
            ['/favicon-32x32.png', '32x32'],
            ['/favicon-96x96.png', '96x96'],
            ['/favicon-16x16.png', '16x16'],
        ].forEach(([href, sizes]) => {
            const link = document.createElement('link');
            link.setAttribute('rel', 'icon');
            if (sizes) {
                link.setAttribute('type', 'image/png');
                link.setAttribute('sizes', sizes);
            }
            link.setAttribute('href', href);
            document.head.appendChild(link);
        });
        document.title = 'Online-Beratung Admin';
    }
    return <Story />;
};

/**
 * The real component on a router: switching sections changes this page's own tab icon and title;
 * a route without a section restores the defaults; a Träger theme change recolours the icon.
 */
export const LiveTab: Story = {
    decorators: [withIndexHtmlHead],
    parameters: { route: routePathNames.tenantAdmins },
    render: () => {
        const sections = buildSections();
        return (
            <>
                <SectionTabIdentity navItems={sections.slice(0, -1)} accountItem={sections[sections.length - 1]} />
                <LiveControls sections={sections} />
            </>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        applyAdminTheme({ primaryColor: TENANTS.caritas.primaryColor });
        const caritas = tenantColors('caritas');
        await waitFor(() => expect(tabIconHref()).toMatch(/^data:image\/svg\+xml,/));
        await waitFor(() => expect(attr(tabSvg(), 'rect', 'fill')).toBe(caritas.tile));
        await expect(document.title).toBe(label('sidebar.users'));
        await waitFor(() => expect(document.querySelector('link[data-section-icon-png]')).not.toBeNull());
        await expect(document.querySelectorAll('link[data-section-icon]')).toHaveLength(5);
        const users = tabIconHref();

        await userEvent.click(canvas.getByRole('button', { name: label('sidebar.account') }));
        await waitFor(() => expect(tabIconHref()).not.toBe(users));
        await expect(document.title).toBe(label('sidebar.account'));

        await userEvent.click(canvas.getByRole('button', { name: `Theme: ${TENANTS.blue.name}` }));
        const blue = tenantColors('blue');
        await waitFor(() => expect(attr(tabSvg(), 'rect', 'fill')).toBe(blue.tile));
        await expect(attr(tabSvg(), 'g.glyph', 'fill')).toBe(blue.glyph);

        await userEvent.click(canvas.getByRole('button', { name: 'No section (login)' }));
        await waitFor(() => expect(tabIconHref()).toBe('/favicon.ico'));
        await expect(document.title).toBe('Online-Beratung Admin');
        await expect(document.querySelector('link[data-section-icon-png]')).toBeNull();

        // Leave the page showing a section icon for manual inspection.
        await userEvent.click(canvas.getByRole('button', { name: label('sidebar.agency') }));
        await waitFor(() => expect(document.title).toBe(label('sidebar.agency')));
    },
};
