import { tutorialProgressEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { TutorialProgressItem, TutorialProgressStatus } from './getTutorialProgress';

export interface UpsertTutorialProgressRequest {
    surface: 'frontend' | 'admin';
    tourId: string;
    tourVersion: number;
    status: TutorialProgressStatus;
    currentStepId?: string;
}

/**
 * Upserts the caller's own versioned tutorial progress. Failures reject so
 * the UI never reports a completion the server has not accepted.
 */
export const upsertTutorialProgress = (request: UpsertTutorialProgressRequest): Promise<TutorialProgressItem> => {
    return fetchData({
        url: tutorialProgressEndpoint,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(request),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};
