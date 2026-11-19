import { useCallback } from 'react';
import { Card } from '../Card';
import { TilePicture } from '../TileFill';
import tutorialsPicture from '../../resources/img/tile-help/tutorials.webp';
import { ReactComponent as TopicIcon } from '../../resources/img/svg/topic.svg';
import { TourOverviewCarousel } from './TourOverviewCarousel';
import { adminTours } from './tourDefinitions';
import { tourLaunchStore, useTourLaunchState } from './tourLaunchStore';
import { useTourAudience } from './tourAudience';
import { versionedTourProgressRepository } from './versionedTourProgressRepository';
import type { TourDefinition } from './types';

/**
 * Profile card wiring the tutorial carousel to the versioned progress API.
 * Starting a tour only requests it: the global `TourHost` in the protected
 * layout runs it, so the tour survives the navigation of its own steps.
 */
export const TourOverviewSection = () => {
    const audience = useTourAudience();
    const { progressRevision } = useTourLaunchState();

    // A new revision (a tour just finished) gives the carousel a new loader,
    // so the card shows the freshly saved status.
    const loadProgress = useCallback(
        () => versionedTourProgressRepository.getProgress(),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the revision is the reload trigger
        [progressRevision],
    );

    const handleStartTour = useCallback((tour: TourDefinition) => {
        tourLaunchStore.requestLaunch(tour.id);
    }, []);

    return (
        <Card
            titleKey="productTour.overview.title"
            subTitleKey="productTour.overview.subtitle"
            headerIcon={<TopicIcon />}
            picture={<TilePicture src={tutorialsPicture} />}
        >
            <TourOverviewCarousel
                tours={adminTours}
                audience={audience}
                loadProgress={loadProgress}
                onStartTour={handleStartTour}
            />
        </Card>
    );
};
