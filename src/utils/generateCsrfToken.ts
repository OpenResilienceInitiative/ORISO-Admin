import { getValueFromCookie, setValueInCookie } from '../api/auth/accessSessionCookie';

const generateCsrfToken = (refreshToken = false) => {
    const currentToken = getValueFromCookie('CSRF-TOKEN');
    // only refresh if necessary to avoid errors on asnyc functionality
    if (!currentToken || refreshToken) {
        let token = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < 18; i += 1) {
            token += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        setValueInCookie('CSRF-TOKEN', token);
        return token;
    }
    return currentToken;
};

export default generateCsrfToken;
