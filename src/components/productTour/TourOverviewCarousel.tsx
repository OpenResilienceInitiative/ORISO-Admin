import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, BUTTON_TYPES } from '../button/Button';
import type { TutorialProgressItem } from '../../api/tutorial/getTutorialProgress';
import type { TourAudience, TourDefinition, TourStatus } from './types';

export type TourStartMode = 'start' | 'continue' | 'restart';

type ProgressSlice = Pick<TutorialProgressItem, 'tourId' | 'tourVersion' | 'status' | 'currentStepId'>;

export interface TourOverviewCarouselProps {
    tours: TourDefinition[];
    audience: TourAudience;
    /** Loads the signed-in user's versioned progress for the admin surface. */
    loadProgress: () => Promise<ProgressSlice[]>;
    onStartTour: (tour: TourDefinition, mode: TourStartMode) => void;
}

const actionForStatus = (status: TourStatus): TourStartMode => {
    if (status === 'in_progress') {
        return 'continue';
    }
    if (status === 'completed' || status === 'skipped') {
        return 'restart';
    }
    return 'start';
};

/**
 * Profile overview of the tutorials available to the signed-in admin: title,
 * summary, versioned progress state and a Start/Continue/Restart action.
 * A newer tour version is a fresh progress scope and is offered again.
 */
export const TourOverviewCarousel = ({ tours, audience, loadProgress, onStartTour }: TourOverviewCarouselProps) => {
    const { t } = useTranslation();
    const [progress, setProgress] = useState<ProgressSlice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        loadProgress()
            .then((items) => {
                if (!cancelled) {
                    setProgress(items);
                }
            })
            .catch(() => {
                // Without progress data every tour is offered as not started.
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [loadProgress]);

    const eligibleTours = tours.filter((tour) => tour.surface === 'admin' && tour.audiences.includes(audience));

    const statusFor = (tour: TourDefinition): TourStatus =>
        progress.find((item) => item.tourId === tour.id && item.tourVersion === tour.version)?.status ?? 'not_started';

    if (isLoading) {
        return null;
    }

    if (eligibleTours.length === 0) {
        return <p className="tourOverview__empty">{t('productTour.overview.empty')}</p>;
    }

    return (
        <ul className="tourOverview__list" aria-label={t('productTour.overview.title')}>
            {eligibleTours.map((tour) => {
                const status = statusFor(tour);
                const mode = actionForStatus(status);
                return (
                    <li className="tourOverview__card" key={tour.id}>
                        <span className={`tourOverview__status tourOverview__status--${status}`}>
                            {t(`productTour.overview.status.${status}`)}
                        </span>
                        <h3 className="tourOverview__cardTitle">{t(tour.titleKey)}</h3>
                        <p className="tourOverview__cardSummary">{t(tour.summaryKey)}</p>
                        <Button
                            item={{
                                label: t(`productTour.overview.action.${mode}`),
                                type: mode === 'restart' ? BUTTON_TYPES.SECONDARY : BUTTON_TYPES.PRIMARY,
                            }}
                            buttonHandle={() => onStartTour(tour, mode)}
                            className="tourOverview__action"
                        />
                    </li>
                );
            })}
        </ul>
    );
};
