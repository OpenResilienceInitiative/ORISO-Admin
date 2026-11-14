import { describe, expect, it } from 'vite-plus/test';
import {
    DEFAULT_SHOW_ASKER_USERNAMES_POLICY,
    isCalendarPolicyLocked,
    resolveShowAskerUsernamesPolicy,
    toCalendarWrite,
    withoutCalendar,
} from './calendarPolicy';

// Seam 1: the pure rules of the calendar policies (ADR-032, ORISO-TenantService#365):
// calendar = { visibilityScope: {value, mode, inherited}, showAskerUsernames: {value, mode, inherited} }.

describe('resolveShowAskerUsernamesPolicy', () => {
    it('falls back to "off, a recommendation" when the field is absent or not a boolean', () => {
        expect(resolveShowAskerUsernamesPolicy(undefined)).toEqual({
            value: false,
            mode: 'SUGGESTED',
            inherited: true,
        });
        expect(resolveShowAskerUsernamesPolicy(null)).toEqual(DEFAULT_SHOW_ASKER_USERNAMES_POLICY);
        expect(resolveShowAskerUsernamesPolicy({ value: 'yes' } as never)).toEqual(DEFAULT_SHOW_ASKER_USERNAMES_POLICY);
    });

    it('keeps a stored policy as served and fills a missing mode with a recommendation', () => {
        expect(resolveShowAskerUsernamesPolicy({ value: true, mode: 'ENFORCED', inherited: true })).toEqual({
            value: true,
            mode: 'ENFORCED',
            inherited: true,
        });
        expect(resolveShowAskerUsernamesPolicy({ value: true })).toEqual({
            value: true,
            mode: 'SUGGESTED',
            inherited: false,
        });
    });
});

describe('isCalendarPolicyLocked', () => {
    it('locks a Träger admin when the platform enforces the value', () => {
        expect(isCalendarPolicyLocked({ mode: 'ENFORCED', inherited: true }, 'tenant')).toBe(true);
    });

    it('lets a Träger admin change a recommendation and its own value; never locks the platform', () => {
        expect(isCalendarPolicyLocked({ mode: 'SUGGESTED', inherited: true }, 'tenant')).toBe(false);
        expect(isCalendarPolicyLocked({ mode: 'ENFORCED', inherited: false }, 'tenant')).toBe(false);
        expect(isCalendarPolicyLocked({ mode: 'ENFORCED', inherited: true }, 'platform')).toBe(false);
    });
});

describe('toCalendarWrite', () => {
    it('writes the changed policy with value and mode only, never the read-only marker', () => {
        expect(
            toCalendarWrite(
                {
                    visibilityScope: { value: 'AGENCY', mode: 'SUGGESTED', inherited: true },
                    showAskerUsernames: { value: false, mode: 'SUGGESTED', inherited: true },
                },
                { visibilityScope: { value: 'TENANT', mode: 'ENFORCED' } },
            ),
        ).toEqual({ calendar: { visibilityScope: { value: 'TENANT', mode: 'ENFORCED' } } });
    });

    it('echoes the other policy when this level set it itself, so the save does not clear it', () => {
        expect(
            toCalendarWrite(
                {
                    visibilityScope: { value: 'PLATFORM', mode: 'SUGGESTED', inherited: false },
                    showAskerUsernames: { value: false, mode: 'SUGGESTED', inherited: true },
                },
                { showAskerUsernames: { value: true, mode: 'SUGGESTED' } },
            ),
        ).toEqual({
            calendar: {
                visibilityScope: { value: 'PLATFORM', mode: 'SUGGESTED' },
                showAskerUsernames: { value: true, mode: 'SUGGESTED' },
            },
        });
    });

    it('leaves an inherited policy out, so it keeps following the platform', () => {
        const write = toCalendarWrite(
            {
                visibilityScope: { value: 'TENANT', mode: 'ENFORCED', inherited: true },
                showAskerUsernames: { value: false, mode: 'SUGGESTED', inherited: true },
            },
            { showAskerUsernames: { value: true, mode: 'SUGGESTED' } },
        );
        expect(write.calendar).not.toHaveProperty('visibilityScope');
        expect(write.calendar.showAskerUsernames).toEqual({ value: true, mode: 'SUGGESTED' });
    });

    it('treats a platform preset without markers as stored, and copes with a backend without the block', () => {
        expect(
            toCalendarWrite(
                {
                    visibilityScope: { value: 'AGENCY', mode: 'SUGGESTED' },
                    showAskerUsernames: { value: true, mode: 'ENFORCED' },
                },
                { visibilityScope: { value: 'PLATFORM', mode: 'SUGGESTED' } },
            ).calendar.showAskerUsernames,
        ).toEqual({ value: true, mode: 'ENFORCED' });
        expect(toCalendarWrite(undefined, { visibilityScope: { value: 'TENANT', mode: 'SUGGESTED' } })).toEqual({
            calendar: { visibilityScope: { value: 'TENANT', mode: 'SUGGESTED' } },
        });
    });
});

describe('withoutCalendar', () => {
    it('leaves the calendar out and keeps everything else, without touching the input', () => {
        const body = {
            permissionsPageEnabled: true,
            internalGroupChat: { recipientScope: { value: 'TENANT' as const, mode: 'SUGGESTED' as const } },
            calendar: { visibilityScope: { value: 'TENANT' as const, mode: 'SUGGESTED' as const } },
        };
        expect(withoutCalendar(body)).toEqual({
            permissionsPageEnabled: true,
            internalGroupChat: { recipientScope: { value: 'TENANT', mode: 'SUGGESTED' } },
        });
        expect(body.calendar).toBeDefined();
    });
});
