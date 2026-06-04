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

        // console.log('🔍 getKeycloakAccessToken: loginEndpoint:', loginEndpoint);
        // console.log('🔍 getKeycloakAccessToken: username:', username);
        // console.log('🔍 getKeycloakAccessToken: tryUnencryptedForEmail:', tryUnencryptedForEmail);

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
                // console.log('🔍 getKeycloakAccessToken: response status:', response.status);
                if (response.status === 200) {
                    response
                        .json()
                        .then((dataResponse: LoginData) => {
                            // console.log('🔍 getKeycloakAccessToken: SUCCESS - got tokens');
                            resolve(dataResponse);
                        })
                        .catch(reject);
                } else if (response.status === 400) {
                    response.json().then((data) => {
                        // console.log('🔍 getKeycloakAccessToken: 400 error:', data);
                        reject(
                            new FetchErrorWithOptions(FETCH_ERRORS.BAD_REQUEST, {
                                data,
                            }),
                        );
                    });
                } else if (response.status === 401) {
                    // console.log('🔍 getKeycloakAccessToken: 401 error');
                    if (!tryUnencryptedForEmail) {
                        getKeycloakAccessToken({
                            ...loginProps,
                            tryUnencryptedForEmail: true,
                        })
                            .then(resolve)
                            .catch(reject);
                    } else {
                        reject(FETCH_ERRORS.UNAUTHORIZED);
                    }
                } else {
                    // console.log('🔍 getKeycloakAccessToken: Other error status:', response.status);
                    reject(new Error('keycloakLogin'));
                }
            })
            .catch(() => {
                // console.log('🔍 getKeycloakAccessToken: Fetch error:', error);
                reject(new Error('keycloakLogin'));
            });
    });

export default getKeycloakAccessToken;
