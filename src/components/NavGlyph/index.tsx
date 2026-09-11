import { ReactComponent as CounselingGlyph } from '../../resources/img/svg/nav-glyphs/counseling.svg';
import { ReactComponent as DisplaySettingsGlyph } from '../../resources/img/svg/nav-glyphs/display_settings.svg';
import { ReactComponent as LinksGlyph } from '../../resources/img/svg/nav-glyphs/links.svg';
import { ReactComponent as LogoutGlyph } from '../../resources/img/svg/nav-glyphs/logout.svg';
import { ReactComponent as LogsGlyph } from '../../resources/img/svg/nav-glyphs/logs.svg';
import { ReactComponent as ProfileGlyph } from '../../resources/img/svg/nav-glyphs/profile.svg';
import { ReactComponent as StatisticsGlyph } from '../../resources/img/svg/nav-glyphs/statistics.svg';
import { ReactComponent as TenantsGlyph } from '../../resources/img/svg/nav-glyphs/tenants.svg';
import { ReactComponent as TopicsGlyph } from '../../resources/img/svg/nav-glyphs/topics.svg';
import { ReactComponent as UsersGlyph } from '../../resources/img/svg/nav-glyphs/users.svg';

/**
 * One glyph per destination, in a single colour that follows the surrounding
 * text.
 *
 * The three-state assets in `resources/img/svg/navbar` cannot serve the mobile
 * navigation: they carry fixed fills, but the same destination now renders dark
 * on a rose pill and rose on a dark pill. They also each open with a Figma
 * `<mask id="mask0_1_…">`, and those ids collide once several are inlined on
 * one page — which silently blanks glyphs. These are the same shapes with the
 * mask stripped and every fill switched to `currentColor`.
 */
export const NAV_GLYPHS = {
    counseling: CounselingGlyph,
    displaySettings: DisplaySettingsGlyph,
    links: LinksGlyph,
    logout: LogoutGlyph,
    logs: LogsGlyph,
    profile: ProfileGlyph,
    statistics: StatisticsGlyph,
    tenants: TenantsGlyph,
    topics: TopicsGlyph,
    users: UsersGlyph,
} as const;

export type NavGlyphName = keyof typeof NAV_GLYPHS;

export interface NavGlyphProps {
    name: NavGlyphName;
    /** Edge length in px. The design uses 24 in pills and 20 inside the FAB. */
    size?: number;
    className?: string;
}

export const NavGlyph = ({ className, name, size = 24 }: NavGlyphProps) => {
    const Glyph = NAV_GLYPHS[name];

    return <Glyph aria-hidden focusable="false" role="presentation" width={size} height={size} className={className} />;
};

export default NavGlyph;
