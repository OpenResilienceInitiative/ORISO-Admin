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

    it('keeps merging the submitted values over the stored ones', () => {
        const body = buildTopicRequestBody(stored, { name: { de: 'Suchtberatung' } });

        expect(body).toMatchObject({ id: 4, name: { de: 'Suchtberatung' }, external: false });
    });
});
