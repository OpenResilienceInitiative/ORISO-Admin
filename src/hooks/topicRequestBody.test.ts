import { describe, expect, it } from 'vitest';
import { buildTopicRequestBody } from './topicRequestBody';

const stored = { id: 4, name: { de: 'Sucht' }, description: { de: 'alt' }, status: 'ACTIVE' };

describe('buildTopicRequestBody', () => {
    it('leaves an active topic active when the submitted card has no status field', () => {
        // The "name and description" card registers only those two fields. Editing a
        // typo there used to take the topic offline: it vanished from registration
        // and from every agency topic picker, with a success toast and no mention of
        // status anywhere on the screen.
        const body = buildTopicRequestBody(stored, { name: { de: 'Suchtberatung' } });

        expect(body.status).toBe('ACTIVE');
    });

    it('still deactivates when the settings card actually submits the switch', () => {
        expect(buildTopicRequestBody(stored, { status: false }).status).toBe('INACTIVE');
    });

    it('activates when the switch is submitted as on', () => {
        expect(buildTopicRequestBody({ ...stored, status: 'INACTIVE' }, { status: true }).status).toBe('ACTIVE');
    });

    it('strips the per-language translate metadata the form carries', () => {
        // The form field holds the editing helper alongside the values; sending it
        // would put a key in the topic payload the API never asked for.
        const body = buildTopicRequestBody(stored, {
            name: { de: 'Suchtberatung', translate: { en: 'Addiction counselling' } },
            description: { de: 'neu', translate: { en: 'new' } },
        });

        // The builder sets translate: undefined rather than deleting the key, so the
        // object still has it -- what matters is the body that reaches the API, and
        // JSON.stringify is where undefined values disappear. Asserting on the object
        // would pass a deletion and fail the equivalent, correct implementation.
        const sent = JSON.parse(JSON.stringify(body));

        expect(sent.name).not.toHaveProperty('translate');
        expect(sent.description).not.toHaveProperty('translate');
        expect(sent.name.de).toBe('Suchtberatung');
    });

    it('keeps merging the submitted values over the stored ones', () => {
        const body = buildTopicRequestBody(stored, { name: { de: 'Suchtberatung' } });

        expect(body).toMatchObject({ id: 4, name: { de: 'Suchtberatung' }, external: false });
    });
});
