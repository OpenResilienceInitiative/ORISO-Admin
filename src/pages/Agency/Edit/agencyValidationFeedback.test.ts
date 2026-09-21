import { describe, expect, it } from 'vitest';
import { describeAgencyValidationErrors } from './agencyValidationFeedback';

const t = ((key: string) => `t:${key}`) as never;

describe('describeAgencyValidationErrors', () => {
    it('names every failing field the user can see', () => {
        expect(
            describeAgencyValidationErrors(
                [
                    { name: ['name'], errors: ['required'] },
                    { name: ['tenantId'], errors: ['required'] },
                ],
                t,
            ),
        ).toBe('t:agency.edit.general.general_information.name, t:agency.edit.general.more_settings.tenant.title');
    });

    it('resolves nested field paths', () => {
        expect(describeAgencyValidationErrors([{ name: ['demographics', 'genders'], errors: ['required'] }], t)).toBe(
            't:agency.gender',
        );
    });

    it('drops fields without errors and unknown paths instead of showing raw keys', () => {
        expect(
            describeAgencyValidationErrors(
                [
                    { name: ['city'], errors: [] },
                    { name: ['somethingNew'], errors: ['required'] },
                ],
                t,
            ),
        ).toBe('');
    });

    it('survives a missing error list', () => {
        expect(describeAgencyValidationErrors(undefined, t)).toBe('');
    });
});
