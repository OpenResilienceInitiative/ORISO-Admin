import { describe, expect, it } from 'vite-plus/test';
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY_PATTERN, passwordErrorKey } from './consultantCredentialRules';

describe('consultant password policy', () => {
    it('is 16 characters, the same number the app registration demands', () => {
        expect(PASSWORD_MIN_LENGTH).toBe(16);
    });

    it('rejects 15 characters as too short and accepts 16', () => {
        expect(passwordErrorKey('Abcdefghij1234!')).toBe('message.error.password.minLength');
        expect(passwordErrorKey('Abcdefghij12345!')).toBeNull();
    });

    it('reports the policy, not the length, for a long but weak password', () => {
        expect(passwordErrorKey('abcdefghijklmnopqrs')).toBe('message.error.password.policy');
    });

    it('keeps the pattern in step with the constant', () => {
        expect(PASSWORD_POLICY_PATTERN.test('Abcdefghij1234!')).toBe(false);
        expect(PASSWORD_POLICY_PATTERN.test('Abcdefghij12345!')).toBe(true);
    });
});
