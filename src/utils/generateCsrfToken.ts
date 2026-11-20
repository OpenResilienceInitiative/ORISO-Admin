import { getValueFromCookie, setValueInCookie } from '../api/auth/accessSessionCookie';

const TOKEN_LENGTH = 18;
const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
// Keep only complete sets of the alphabet so every character is equally likely.
const UNBIASED_BYTE_LIMIT = 256 - (256 % TOKEN_ALPHABET.length);

const generateCsrfToken = (refreshToken = false) => {
    const currentToken = getValueFromCookie('CSRF-TOKEN');
    if (currentToken && !refreshToken) {
        return currentToken;
    }

    let token = '';
    const bytes = new Uint8Array(TOKEN_LENGTH);
    while (token.length < TOKEN_LENGTH) {
        const missingBytes = bytes.subarray(0, TOKEN_LENGTH - token.length);
        const randomBytes = globalThis.crypto.getRandomValues(missingBytes);
        const characters = Array.from(randomBytes, (byte) =>
            byte < UNBIASED_BYTE_LIMIT ? TOKEN_ALPHABET.charAt(byte % TOKEN_ALPHABET.length) : '',
        );
        token += characters.join('');
    }

    setValueInCookie('CSRF-TOKEN', token);
    return token;
};

export default generateCsrfToken;
