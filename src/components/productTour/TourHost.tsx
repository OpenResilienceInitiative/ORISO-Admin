import { useCallback, useEffect } from 'react';
import { ProductTourAdapter } from './ProductTourAdapter';
import { ProductTourTooltip } from './ProductTourTooltip';
import { adminTours } from './tourDefinitions';
import { tourLaunchStore, useTourLaunchState } from './tourLaunchStore';
import { versionedTourProgressRepository } from './versionedTourProgressRepository';
import type { TourDefinition, TourProgress } from './types';

export interface TourHostProps {
    /** Tours the host may run; defaults to the tours enabled in the admin app. */
    tours?: TourDefinition[];
}

/**
 * Global Admin tour host, mounted once in the protected layout. It renders the
 * requested tour outside every page, so a step that navigates does not unmount
 * the tour, and it persists the terminal status through the versioned API.
 */
export const TourHost = ({ tours = adminTours }: TourHostProps) => {
    const { request } = useTourLaunchState();
    const tour = request ? tours.find((candidate) => candidate.id === request.tourId) : undefined;

    useEffect(() => {
        if (request && !tour) {
            tourLaunchStore.cancel();
        }
    }, [request, tour]);

    const handleTerminalStatus = useCallback(async (progress: TourProgress) => {
        try {
            await versionedTourProgressRepository.saveProgress(progress);
        } finally {
            tourLaunchStore.finish();
        }
    }, []);

    if (!request || !tour) {
        return null;
    }

    return (
        <ProductTourAdapter
            key={request.requestedAt}
            tour={tour}
            active
            tooltipComponent={ProductTourTooltip}
            onTerminalStatus={handleTerminalStatus}
            onAbort={tourLaunchStore.cancel}
        />
    );
};

export default TourHost;
