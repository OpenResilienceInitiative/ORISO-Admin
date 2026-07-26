import { tutorialProgressEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export type TutorialProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface TutorialProgressItem {
    tourId: string;
    tourVersion: number;
    surface: 'frontend' | 'admin';
    status: TutorialProgressStatus;
    currentStepId?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
}

export const getTutorialProgress = (surface: 'frontend' | 'admin'): Promise<TutorialProgressItem[]> => {
    return fetchData({
        url: `${tutorialProgressEndpoint}?surface=${surface}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};
