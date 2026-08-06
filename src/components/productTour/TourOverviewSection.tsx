import { useCallback, useState } from 'react';
import { Card } from '../Card';
import { ProductTourAdapter } from './ProductTourAdapter';
import { ProductTourTooltip } from './ProductTourTooltip';
import { TourOverviewCarousel, TourStartMode } from './TourOverviewCarousel';
import { adminTours } from './tourDefinitions';
import { versionedTourProgressRepository } from './versionedTourProgressRepository';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { UserRole } from '../../enums/UserRole';
import type { TourAudience, TourDefinition, TourProgress } from './types';

interface TourLaunch {
    tour: TourDefinition;
    mode: TourStartMode;
    requestedAt: number;
}

/**
 * Profile card wiring the tutorial carousel to the versioned progress API.
 * No production tour ships yet (adminTours is empty by epic decision), so the
 * card shows the empty state until concrete admin tours are accepted.
 */
export const TourOverviewSection = () => {
    const { hasRole, isSuperAdmin } = useUserRoles();
    const [launch, setLaunch] = useState<TourLaunch | null>(null);

    let audience: TourAudience = 'agency_admin';
    if (isSuperAdmin) {
        audience = 'platform_admin';
    } else if (hasRole(UserRole.TenantAdmin) || hasRole(UserRole.SingleTenantAdmin)) {
        audience = 'tenant_admin';
    }

    const loadProgress = useCallback(() => versionedTourProgressRepository.getProgress(), []);

    const handleStartTour = useCallback((tour: TourDefinition, mode: TourStartMode) => {
        setLaunch({ tour, mode, requestedAt: Date.now() });
    }, []);

    const handleTerminalStatus = useCallback(async (progress: TourProgress) => {
        try {
            await versionedTourProgressRepository.saveProgress(progress);
        } finally {
            setLaunch(null);
        }
    }, []);

    return (
        <Card titleKey="productTour.overview.title" subTitleKey="productTour.overview.subtitle">
            <TourOverviewCarousel
                tours={adminTours}
                audience={audience}
                loadProgress={loadProgress}
                onStartTour={handleStartTour}
            />
            {launch && (
                <ProductTourAdapter
                    key={launch.requestedAt}
                    tour={launch.tour}
                    active
                    tooltipComponent={ProductTourTooltip}
                    onTerminalStatus={handleTerminalStatus}
                />
            )}
        </Card>
    );
};
