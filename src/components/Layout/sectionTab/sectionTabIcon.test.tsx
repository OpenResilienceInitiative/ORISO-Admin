import { afterEach, describe, expect, it } from 'vite-plus/test';
import routePathNames from '../../../appConfig';
import { Resource } from '../../../enums/Resource';
import { UserRole } from '../../../enums/UserRole';
import { buildAdminNavItems } from '../adminNavItems';
import { canFor, hasRoleFor } from '../adminNavFixtures';
import type { AdminSidebarNavItem } from '../AdminSidebar';
import { activeNavIconFor } from '../NavIcon';
import { ReactComponent as HomeActiveIcon } from '../../../resources/img/svg/navbar/home_active.svg';
import { ReactComponent as DisplaySettingsActiveIcon } from '../../../resources/img/svg/navbar/display_settings_active.svg';
import { ReactComponent as TenantsActiveIcon } from '../../../resources/img/svg/navbar/tenants_active.svg';
import { ReactComponent as CounselingActiveIcon } from '../../../resources/img/svg/navbar/counseling_active.svg';
import { ReactComponent as UsersActiveIcon } from '../../../resources/img/svg/navbar/users_active.svg';
import { ReactComponent as StatisticsActiveIcon } from '../../../resources/img/svg/navbar/statistics_active.svg';
import { ReactComponent as InviteActiveIcon } from '../../../resources/img/svg/navbar/invite_active.svg';
import { ReactComponent as LogsActiveIcon } from '../../../resources/img/svg/navbar/logs_active.svg';
import { ReactComponent as ProfileActiveIcon } from '../../../resources/img/svg/navbar/profile_active.svg';
import { ReactComponent as TopicsActiveIcon } from '../../../resources/img/svg/navbar/topics_active.svg';
import {
    buildSectionTabIconSvg,
    measureGlyphBox,
    readSectionTabColors,
    resolveSectionNavItem,
    resolveTabColor,
    toSvgDataUrl,
} from './sectionTabIcon';
import { DEFAULT_ADMIN_SEED } from '../../../utils/applyAdminTheme';

// A platform admin sees every sidebar section.
const items = buildAdminNavItems({
    isSuperAdmin: true,
    hasRole: hasRoleFor(UserRole.TenantAdmin),
    can: canFor(...(Object.values(Resource) as Resource[])),
    labels: {
        account: 'Mein Account',
        agency: 'Beratungsstellen',
        home: 'Home',
        links: 'Einladen',
        logs: 'Logs',
        settings: 'Einstellungen',
        statistics: 'Statistiken',
        tenants: 'Träger',
        users: 'Konten',
    },
    settingsPath: routePathNames.themeSettings,
});
const account: AdminSidebarNavItem = {
    key: 'account',
    to: routePathNames.userProfile,
    label: 'Mein Account',
    iconPath: routePathNames.userProfile,
};
const sections = [...items, account];

describe('activeNavIconFor: the glyph the sidebar shows for an active section', () => {
    it.each([
        [routePathNames.home, HomeActiveIcon],
        [routePathNames.themeSettings, DisplaySettingsActiveIcon],
        [routePathNames.tenants, TenantsActiveIcon],
        [routePathNames.agency, CounselingActiveIcon],
        [routePathNames.users, UsersActiveIcon],
        [routePathNames.statistic, StatisticsActiveIcon],
        [routePathNames.links, InviteActiveIcon],
        [routePathNames.logs, LogsActiveIcon],
        [routePathNames.userProfile, ProfileActiveIcon],
        [routePathNames.topics, TopicsActiveIcon],
    ])('%s', (path, icon) => {
        expect(activeNavIconFor(path)).toBe(icon);
    });

    it('has no glyph for an unknown path', () => {
        expect(activeNavIconFor('/admin/nowhere')).toBeNull();
    });

    it('covers every sidebar section', () => {
        expect(sections.every((item) => activeNavIconFor(item.iconPath))).toBe(true);
    });
});

describe('resolveSectionNavItem: route → sidebar section (same rule as the sidebar highlight)', () => {
    it.each([
        ['/admin/home', 'home', HomeActiveIcon],
        ['/admin/theme-settings', 'theme', DisplaySettingsActiveIcon],
        ['/admin/theme-settings/legal', 'theme', DisplaySettingsActiveIcon],
        ['/admin/tenants', 'tenants', TenantsActiveIcon],
        ['/admin/tenants/12/edit', 'tenants', TenantsActiveIcon],
        ['/admin/agency', 'agency', CounselingActiveIcon],
        ['/admin/agency/7/functionalities', 'agency', CounselingActiveIcon],
        ['/admin/users/consultants', 'counselors', UsersActiveIcon],
        ['/admin/users/agency-admins', 'counselors', UsersActiveIcon],
        ['/admin/statistic', 'statistics', StatisticsActiveIcon],
        ['/admin/links/tenants', 'links', InviteActiveIcon],
        ['/admin/logs', 'logs', LogsActiveIcon],
        ['/admin/logs/deletions', 'logs', LogsActiveIcon],
        ['/admin/profil', 'account', ProfileActiveIcon],
        ['/admin/profil/', 'account', ProfileActiveIcon],
        ['/admin/profil/security', 'account', ProfileActiveIcon],
    ])('%s → %s', (pathname, key, icon) => {
        const item = resolveSectionNavItem(pathname, sections);
        expect(item?.key).toBe(key);
        expect(activeNavIconFor(item!.iconPath)).toBe(icon);
    });

    it.each([
        '/admin',
        '/admin/login',
        '/admin/password-reset',
        '/admin/password-reset/confirm',
        '/admin/tenant-onboarding/abc',
        '/admin/counsellor-onboarding/abc',
        '/impressum',
        '/datenschutz',
        '/admin/nowhere',
        '/admin/homepage',
    ])('%s has no section, so the default favicon stays', (pathname) => {
        expect(resolveSectionNavItem(pathname, sections)).toBeNull();
    });

    it('prefers the most specific entry', () => {
        const outer = { key: 'a', to: '/a', label: 'A', iconPath: routePathNames.home };
        const inner = { key: 'b', to: '/a/b', label: 'B', iconPath: routePathNames.logs };
        expect(resolveSectionNavItem('/a/b/c', [outer, inner])?.key).toBe('b');
    });

    it('ignores entries without a known glyph and copes with no items', () => {
        expect(resolveSectionNavItem('/x', [{ key: 'x', to: '/x', label: 'X', iconPath: '/unknown' }])).toBeNull();
        expect(resolveSectionNavItem('/admin/home', undefined)).toBeNull();
    });
});

describe('resolveTabColor', () => {
    it.each(['#a5000a', '#ABC', '#ffffffff', 'rgb(204, 0, 0)', 'hsl(350, 100%, 41%)', ' #123456 '])(
        'keeps the valid colour %s',
        (color) => {
            expect(resolveTabColor(color, '#000')).toBe(color.trim());
        },
    );

    it.each([undefined, null, '', 'red"><script>', 'url(x)', '#12', 'var(--x)', 'red'])(
        'falls back for %s',
        (color) => {
            expect(resolveTabColor(color as string, '#000')).toBe('#000');
        },
    );
});

describe('readSectionTabColors: the theme tokens primary / on-primary', () => {
    afterEach(() => {
        document.documentElement.removeAttribute('style');
    });

    it('reads the Träger colours the admin theme put on the root', () => {
        document.documentElement.style.setProperty('--m3-primary', '#1c4f8f');
        document.documentElement.style.setProperty('--m3-on-primary', '#f4f4f4');
        expect(readSectionTabColors()).toEqual({ tile: '#1c4f8f', glyph: '#f4f4f4' });
    });

    it('falls back to the default theme tokens when the root has none', () => {
        const colors = readSectionTabColors();
        expect(colors.tile.toLowerCase()).toBe(DEFAULT_ADMIN_SEED.toLowerCase());
        expect(colors.glyph.toLowerCase()).toBe('#ffffff');
    });

    it('falls back per token when a value is not a plain colour', () => {
        document.documentElement.style.setProperty('--m3-primary', 'url(evil)');
        document.documentElement.style.setProperty('--m3-on-primary', '#eeeeee');
        const colors = readSectionTabColors();
        expect(colors.tile.toLowerCase()).toBe(DEFAULT_ADMIN_SEED.toLowerCase());
        expect(colors.glyph).toBe('#eeeeee');
    });
});

describe('buildSectionTabIconSvg', () => {
    const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    const colors = { tile: '#1c4f8f', glyph: '#f4f4f4' };

    it('draws the real sidebar glyph in on-primary on a primary rounded tile', () => {
        const root = parse(buildSectionTabIconSvg(UsersActiveIcon, colors));
        expect(root.nodeName).toBe('svg');
        expect(root.getAttribute('viewBox')).toBe('0 0 64 64');

        const tile = root.querySelector('rect')!;
        expect(tile.getAttribute('fill')).toBe('#1c4f8f');
        expect(tile.getAttribute('rx')).toBe('14');

        const glyph = root.querySelector('g.glyph')!;
        expect(glyph.getAttribute('fill')).toBe('#f4f4f4');
        expect(glyph.getAttribute('color')).toBe('#f4f4f4');
        const inner = glyph.querySelector('svg')!;
        expect(inner.getAttribute('x')).toBe('12');
        expect(inner.getAttribute('y')).toBe('12');
        expect(inner.getAttribute('width')).toBe('40');
        expect(inner.getAttribute('viewBox')).toBe('0 0 40 40');
        // The real glyph path from users_active.svg.
        expect(inner.querySelector('path')!.getAttribute('d')).toMatch(/^M20 34\.2362L29\.3333 28\.5833/);
    });

    it('recolours the hard-coded glyph fills to on-primary', () => {
        const svg = buildSectionTabIconSvg(HomeActiveIcon, colors);
        expect(svg).toContain('<style>.glyph [fill]:not([fill="none"]){fill:#f4f4f4}</style>');
    });

    it('never lets an invalid colour into the markup', () => {
        const svg = buildSectionTabIconSvg(HomeActiveIcon, { tile: '"/><x', glyph: 'url(x)' });
        expect(svg).not.toContain('"/><x');
        expect(svg).not.toContain('url(x)');
    });

    describe('fits: the glyph cropped to its ink (Frank: small = little padding, more weight)', () => {
        const box = { x: 6, y: 5, width: 28, height: 30 };
        const inner = (svg: string) => parse(svg).querySelector('g.glyph svg')!;

        it("'tab' fills 46 of 64 and thickens the lines by 4.5 % of the glyph", () => {
            const svg = buildSectionTabIconSvg(UsersActiveIcon, colors, { fit: 'tab', box });
            const glyph = inner(svg);
            expect(glyph.getAttribute('width')).toBe('46');
            expect(glyph.getAttribute('height')).toBe('46');
            expect(glyph.getAttribute('x')).toBe('9');
            // stroke = 30 * 0.045 = 1.35; the viewBox makes room for half of it on every side.
            expect(glyph.getAttribute('stroke-width')).toBe('1.35');
            expect(glyph.getAttribute('viewBox')).toBe('5.325 4.325 29.35 31.35');
            expect(svg).toContain('.glyph path,.glyph circle,.glyph ellipse,.glyph polygon{stroke:#f4f4f4');
        });

        it("'large' fills 38 of 64 with more air and no extra weight", () => {
            const svg = buildSectionTabIconSvg(UsersActiveIcon, colors, { fit: 'large', box });
            const glyph = inner(svg);
            expect(glyph.getAttribute('width')).toBe('38');
            expect(glyph.getAttribute('x')).toBe('13');
            expect(glyph.hasAttribute('stroke-width')).toBe(false);
            expect(glyph.getAttribute('viewBox')).toBe('6 5 28 30');
            expect(svg).not.toContain('stroke:');
        });

        it('falls back to the icon viewBox at 40 of 64 when the ink is not measured', () => {
            const glyph = inner(buildSectionTabIconSvg(UsersActiveIcon, colors, { fit: 'tab', box: null }));
            expect(glyph.getAttribute('width')).toBe('40');
            expect(glyph.getAttribute('viewBox')).toBe('0 0 40 40');
            expect(glyph.hasAttribute('stroke-width')).toBe(false);
        });

        it('cannot measure ink without a rendering browser (jsdom) and says so with null', () => {
            expect(measureGlyphBox(UsersActiveIcon)).toBeNull();
            expect(document.body.querySelector('svg[aria-hidden]')).toBeNull();
        });
    });

    it('produces an svg data URL', () => {
        const url = toSvgDataUrl('<svg xmlns="http://www.w3.org/2000/svg"/>');
        expect(url.startsWith('data:image/svg+xml,')).toBe(true);
        expect(decodeURIComponent(url.slice('data:image/svg+xml,'.length))).toBe(
            '<svg xmlns="http://www.w3.org/2000/svg"/>',
        );
    });
});
