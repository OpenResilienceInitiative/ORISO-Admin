import { encode, decode } from 'hi-base32';

/**
 * @deprecated RC-era Base32 encoding — no longer sent to backend.
 * Remove once all DB rows are confirmed plaintext.
 * TODO: remove after DB migration verified.
 */
export const encodeUsername = (username: string) => {
    return `enc.${encode(username).replace(/=/g, '.')}`;
};

export const decodeUsername = (username: string) => {
    const isEncoded = username.split('.') && username.split('.')[0] === 'enc';
    return isEncoded ? decode(`${username.split('.')[1].toUpperCase()}=`) : username;
};
