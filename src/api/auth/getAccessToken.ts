import { LoginData } from '../../types/loginData';
import { loginEndpoint } from '../../appConfig';

import { FetchErrorWithOptions, FETCH_ERRORS } from '../fetchData';

const getKeycloakAccessToken = (loginProps: {
    username: string;
    password: string;
    otp?: string;
    tryUnencryptedForEmail?: boolean;
}): Promise<LoginData> =>
    new Promise((resolve, reject) => {
        const { username, password, otp, tryUnencryptedForEmail } = loginProps;

        const dataBody = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}${
            otp ? `&otp=${otp}` : ``
        }&client_id=app&grant_type=password`;

        const req = new Request(loginEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            credentials: 'include',
            body: dataBody,
        });

        fetch(req)
            .then((response) => {
                if (response.status === 200) {
                    response
                        .json()
                        .then((dataResponse: LoginData) => {
                            resolve(dataResponse);
                        })
                        .catch(reject);
                } else if (response.status === 400) {
                    response.json().then((data) => {
                        reject(
                            new FetchErrorWithOptions(FETCH_ERRORS.BAD_REQUEST, {
                                data,
                            }),
                        );
                    });
                } else if (response.status === 429) {
                    // #1338: Keycloak now refuses a code request that is over the
                    // per-window ceiling, and it has always refused a code that was
                    // guessed too often. Both are 429. Without this branch they fell
                    // into the final `else` and the form claimed a network problem,
                    // which sent people to reload and retype instead of waiting.
                    // The body carries `resendAvailableInSeconds` for the first case.
                    response
                        .json()
                        .then((data) => {
                            reject(new FetchErrorWithOptions(FETCH_ERRORS.TOO_MANY_REQUESTS, { data }));
                        })
                        .catch(() => {
                            reject(new FetchErrorWithOptions(FETCH_ERRORS.TOO_MANY_REQUESTS, { data: {} }));
                        });
                } else if (response.status === 401) {
                    if (!tryUnencryptedForEmail) {
                        getKeycloakAccessToken({
                            ...loginProps,
                            tryUnencryptedForEmail: true,
                        })
                            .then(resolve)
                            .catch(reject);
                    } else {
                        // Reject with a real Error so callers can rely on error.message.
                        reject(new Error(FETCH_ERRORS.UNAUTHORIZED));
                    }
                } else {
                    reject(new Error(FETCH_ERRORS.TIMEOUT));
                }
            })
            .catch(() => {
                reject(new Error(FETCH_ERRORS.TIMEOUT));
            });
    });

export default getKeycloakAccessToken;
