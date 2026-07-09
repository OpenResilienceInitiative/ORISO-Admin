import { describe, expect, it } from 'vitest';
import { isReadOnlySetting } from './serverSettingsMeta';

describe('isReadOnlySetting', () => {
    it('returns true when any of the keys is read-only', () => {
        const meta = { smtpHost: { readOnly: true }, smtpPort: { readOnly: false } };
        expect(isReadOnlySetting(meta, ['smtpHost'])).toBe(true);
        expect(isReadOnlySetting(meta, ['smtpPort', 'smtpHost'])).toBe(true);
    });

    it('returns false when none of the keys is read-only', () => {
        const meta = { smtpHost: { readOnly: false } };
        expect(isReadOnlySetting(meta, ['smtpHost'])).toBe(false);
    });

    it('returns false for unknown keys', () => {
        expect(isReadOnlySetting({ smtpHost: { readOnly: true } }, ['missing'])).toBe(false);
    });

    it('returns false for undefined meta or empty keys', () => {
        expect(isReadOnlySetting(undefined, ['smtpHost'])).toBe(false);
        expect(isReadOnlySetting({ smtpHost: { readOnly: true } }, [])).toBe(false);
    });
});
