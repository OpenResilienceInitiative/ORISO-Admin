import { beforeEach, describe, expect, it, vi } from 'vitest';
import generateCsrfToken from './generateCsrfToken';
import { getValueFromCookie, setValueInCookie } from '../api/auth/accessSessionCookie';

vi.mock('../api/auth/accessSessionCookie', () => ({
    getValueFromCookie: vi.fn(),
    setValueInCookie: vi.fn(),
}));

const getMock = vi.mocked(getValueFromCookie);
const setMock = vi.mocked(setValueInCookie);

beforeEach(() => {
    vi.clearAllMocks();
});

describe('generateCsrfToken', () => {
    it('generates and stores an 18-char alphanumeric token when none exists', () => {
        getMock.mockReturnValue('');

        const token = generateCsrfToken();

        expect(token).toMatch(/^[A-Za-z0-9]{18}$/);
        expect(setMock).toHaveBeenCalledWith('CSRF-TOKEN', token);
    });

    it('returns the existing token without regenerating', () => {
        getMock.mockReturnValue('existing-token');

        const token = generateCsrfToken();

        expect(token).toBe('existing-token');
        expect(setMock).not.toHaveBeenCalled();
    });

    it('regenerates when refreshToken is true even if a token exists', () => {
        getMock.mockReturnValue('existing-token');

        const token = generateCsrfToken(true);

        expect(token).not.toBe('existing-token');
        expect(token).toMatch(/^[A-Za-z0-9]{18}$/);
        expect(setMock).toHaveBeenCalledWith('CSRF-TOKEN', token);
    });
});
