import { userDataEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * retrieve all needed user data and store them
 * this function mimics a default response to fail gracefully
 * and do not hinder the user
 */
export const getUserData = () => {
    // retrieve customer
    return fetchData({
        url: userDataEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};
