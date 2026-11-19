import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import routePathNames from '../../appConfig';
import { useAppConfigContext } from '../../context/useAppConfig';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { M3FabMenu, type M3FabMenuItem } from '../M3FabMenu';
import { adminTours } from './tourDefinitions';
import { toursForAudience, useTourAudience } from './tourAudience';
import { tourLaunchStore, useTourLaunchState } from './tourLaunchStore';
import { useTourLauncherVisible } from './tourLauncherPreference';
import { shouldShowTourLauncher } from './tourLauncherVisibility';
import { useAdminTourProgress } from './useAdminTourProgress';
import { useMobileNavInset } from './useMobileNavInset';
import type { TourDefinition, TourStatus } from './types';
import styles from './tourLauncher.module.scss';

const MANAGE_KEY = 'manage-tours';

export interface TourLauncherProps {
    /** Tours to offer; defaults to the tours enabled in the admin app. */
    tours?: TourDefinition[];
}

/**
 * The "?" tour launcher (plan 3.5/3.7): the Admin `M3FabMenu` in a fixed
 * bottom-right wrapper, listing the tours of the admin's audience with their
 * status and a "Rundgänge verwalten" link to the profile tour card. Hidden
 * while a tour runs, when the per-user switch is off, and when the central
 * tours setting is off. Starting a tour only requests it from `TourHost`.
 */
export const TourLauncher = ({ tours = adminTours }: TourLauncherProps) => {
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    const { isStatisticsReader } = useUserRoles();
    const audience = useTourAudience();
    const { request, progressRevision } = useTourLaunchState();
    const [userSwitchOn] = useTourLauncherVisible();
    const [open, setOpen] = useState(false);

    // A Statistik-Leser·in is confined to statistics and has no tour.
    const available = useMemo(
        () => (isStatisticsReader ? [] : toursForAudience(tours, audience)),
        [audience, isStatisticsReader, tours],
    );
    const visible = shouldShowTourLauncher({
        centralToursEnabled: settings?.enableWalkthrough,
        userSwitchOn,
        tourRunning: request !== null,
        availableTourCount: available.length,
    });
    const progress = useAdminTourProgress(progressRevision, visible);
    const navInset = useMobileNavInset(visible);

    useEffect(() => {
        if (!visible) {
            setOpen(false);
        }
    }, [visible]);

    if (!visible) {
        return null;
    }

    const statusFor = (tour: TourDefinition): TourStatus =>
        progress.find((item) => item.tourId === tour.id && item.tourVersion === tour.version)?.status ?? 'not_started';

    const items: M3FabMenuItem[] = available.map((tour) => ({
        key: tour.id,
        label: t(tour.titleKey),
        description: t(`productTour.overview.status.${statusFor(tour)}`),
        icon: <ExploreOutlinedIcon />,
    }));
    const footerItems: M3FabMenuItem[] = [
        {
            key: MANAGE_KEY,
            label: t('productTour.launcher.manage'),
            icon: <TuneOutlinedIcon />,
            to: routePathNames.userProfile,
            tone: 'neutral',
        },
    ];

    const style = navInset > 0 ? ({ '--tour-launcher-nav-inset': `${navInset}px` } as CSSProperties) : undefined;

    return (
        <div className={styles.launcher} style={style} data-admin-tour-launcher>
            <M3FabMenu
                variant="action"
                items={items}
                footerItems={footerItems}
                open={open}
                onOpenChange={setOpen}
                openLabel={t('productTour.launcher.open')}
                closeLabel={t('productTour.launcher.close')}
                triggerIcon={<QuestionMarkIcon />}
                onSelect={(key) => {
                    if (key !== MANAGE_KEY) {
                        tourLaunchStore.requestLaunch(key);
                    }
                }}
            />
        </div>
    );
};

export default TourLauncher;
