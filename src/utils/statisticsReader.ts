import routePathNames from '../appConfig';
import { UserRole } from '../enums/UserRole';
import { ADMIN_PORTAL_ROLES } from './adminPortalAccess';

/**
 * Admin roles that open more than the statistics page. An account that holds one of them keeps
 * its normal admin surface; only a *pure* Statistik-Leser·in is confined to statistics.
 */
const OTHER_ADMIN_ROLES = ADMIN_PORTAL_ROLES.filter((role) => role !== UserRole.StatisticsReader);

/**
 * A Statistik-Leser·in (ORISO-UserService#1666) without any other admin role. Such an account
 * reads the platform statistics like a platform admin and does nothing else: no settings, no
 * users, no Träger, no Home. It is deliberately NOT a super admin — the platform view is granted
 * by explicit checks on the statistics page only.
 */
export const isStatisticsReaderOnly = (roles: readonly string[]): boolean =>
    roles.includes(UserRole.StatisticsReader) && !OTHER_ADMIN_ROLES.some((role) => roles.includes(role));

const isOrBelow = (pathname: string, base: string) => {
    const trimmed = base.replace(/\/$/, '');
    return pathname === trimmed || pathname.startsWith(`${trimmed}/`);
};

/**
 * Where a Statistik-Leser·in is sent instead of `pathname`, or `null` to stay. Statistics and
 * the own profile (password, 2FA) stay reachable; every other admin route lands on statistics.
 */
export const statisticsReaderRedirect = (pathname: string): string | null => {
    if (isOrBelow(pathname, routePathNames.statistic) || isOrBelow(pathname, routePathNames.userProfile)) {
        return null;
    }
    return routePathNames.statistic;
};
