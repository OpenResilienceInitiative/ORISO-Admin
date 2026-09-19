import { describe, expect, it } from 'vitest';
import { buildQuickCreateConsultantData } from './index';

describe('buildQuickCreateConsultantData', () => {
    it('binds a quick-created consultant to the current tenant, agency and topics', () => {
        expect(
            buildQuickCreateConsultantData({ firstname: 'Ada', lastname: 'Lovelace' }, 84, '282', ['7', 12]),
        ).toMatchObject({
            firstname: 'Ada',
            lastname: 'Lovelace',
            tenantId: '84',
            agencyIds: [282],
            topicIds: [7, 12],
        });
    });
});

describe('quick-create payload parity with the full counsellor form', () => {
    it('no longer decides the tone for the admin', () => {
        // formalLanguage was hardcoded true here, so a counsellor created from the
        // agency screen always got the formal address while the full form let the
        // admin choose. Same input, different record, depending on the button used.
        expect(buildQuickCreateConsultantData({ formalLanguage: false }, 1, 2).formalLanguage).toBe(false);
    });

    it('keeps the formal default when the field was never touched', () => {
        expect(buildQuickCreateConsultantData({}, 1, 2).formalLanguage).toBe(true);
    });

    it('sends the behavioural flags explicitly rather than omitting them', () => {
        // JSON.stringify drops undefined keys, so an omitted flag reached the server
        // as "not stated" instead of "false" -- a third state nobody designed for.
        const payload = buildQuickCreateConsultantData({}, 1, 2);

        expect(payload.absent).toBe(false);
        expect(payload.isGroupchatConsultant).toBe(false);
    });

    it('passes every field the form collected straight through', () => {
        const payload = buildQuickCreateConsultantData(
            {
                firstname: 'Ada',
                lastname: 'Lovelace',
                salutation: 'counsellor_female',
                title: 'Dr.',
                position: 'Head of counselling',
                displayName: 'Ada L.',
                internalDisplayName: 'Ada (Team Nord)',
                absent: true,
                absenceMessage: 'Back on Monday',
            },
            7,
            9,
        );

        expect(payload).toMatchObject({
            firstname: 'Ada',
            lastname: 'Lovelace',
            salutation: 'counsellor_female',
            title: 'Dr.',
            position: 'Head of counselling',
            displayName: 'Ada L.',
            internalDisplayName: 'Ada (Team Nord)',
            absent: true,
            absenceMessage: 'Back on Monday',
        });
    });
});
