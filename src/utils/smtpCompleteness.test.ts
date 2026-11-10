import { describe, expect, it } from 'vite-plus/test';
import { isOwnSmtpServerComplete, isSmtpPasswordStored } from './smtpCompleteness';

const complete = { host: 'mail.x', port: 587, from: 'a@x', username: 'mailer', passwordSet: true };

describe('smtpCompleteness', () => {
    it('reads passwordSet first and an older backend’s stored password otherwise', () => {
        expect(isSmtpPasswordStored({ passwordSet: true })).toBe(true);
        expect(isSmtpPasswordStored({ password: 'secret' })).toBe(true);
        expect(isSmtpPasswordStored({ password: '  ' })).toBe(false);
        expect(isSmtpPasswordStored({ passwordSet: false, password: 'secret' })).toBe(false);
        expect(isSmtpPasswordStored(undefined)).toBe(false);
    });

    it('needs host, sender, username, a port from 1 to 65535 and a stored password', () => {
        expect(isOwnSmtpServerComplete(complete)).toBe(true);
        expect(isOwnSmtpServerComplete({ ...complete, port: '465' })).toBe(true);
        expect(isOwnSmtpServerComplete({ ...complete, host: ' ' })).toBe(false);
        expect(isOwnSmtpServerComplete({ ...complete, from: null })).toBe(false);
        expect(isOwnSmtpServerComplete({ ...complete, username: '' })).toBe(false);
        expect(isOwnSmtpServerComplete({ ...complete, port: 0 })).toBe(false);
        expect(isOwnSmtpServerComplete({ ...complete, port: 65536 })).toBe(false);
        expect(isOwnSmtpServerComplete({ ...complete, passwordSet: false })).toBe(false);
        expect(isOwnSmtpServerComplete(null)).toBe(false);
    });
});
