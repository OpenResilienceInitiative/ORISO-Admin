import { describe, expect, it } from 'vite-plus/test';
import { standardJourney, type Journey } from './journey';
import {
    editJourney,
    editJourneys,
    effectiveJourneys,
    inheritedJourneys,
    layersFrom,
    type EditingContext,
    type JourneyCommand,
} from './journeyEditing';

const platform: EditingContext = { level: 'platform', blocked: [] };
const tenant: EditingContext = { level: 'tenant', blocked: [] };
const agency: EditingContext = { level: 'agency', blocked: [] };
const mail = (): Journey => standardJourney('AGENCY_COUNSELLING', 'j1', 1);
const idOf = (journey: Journey, core: string) =>
    Object.values(journey.phases)
        .flat()
        .find((step) => step.core === core)?.id as string;

describe('one rule entry per level', () => {
    const journey = mail();
    const commands: [string, JourneyCommand, boolean, boolean][] = [
        // [name, command, allowed for Träger, allowed for Beratungsstelle]
        [
            'add a question to the check-in',
            { type: 'addStep', phase: 'departure', step: { kind: 'question' }, id: 'q' },
            false,
            false,
        ],
        [
            'add a question on board',
            { type: 'addStep', phase: 'flight', step: { kind: 'question' }, id: 'q' },
            true,
            true,
        ],
        [
            'add a question at arrival',
            { type: 'addStep', phase: 'arrival', step: { kind: 'question' }, id: 'q' },
            true,
            true,
        ],
        [
            'remove the e-mail step',
            { type: 'removeStep', phase: 'departure', stepId: idOf(journey, 'email') },
            false,
            false,
        ],
        ['preselect the topic', { type: 'preselectTopic', on: true }, false, false],
        ['rename the journey', { type: 'rename', name: 'Mine' }, false, false],
        ['change the routes', { type: 'setRoutes', routes: { registration: [], links: [] } }, false, false],
        ['change the survey', { type: 'setSurvey', anonymous: false }, false, false],
    ];
    it.each(commands)('%s', (_name, command, forTenant, forAgency) => {
        expect(editJourney(journey, command, tenant).ok).toBe(forTenant);
        expect(editJourney(journey, command, agency).ok).toBe(forAgency);
    });

    it('names why a change was refused', () => {
        expect(editJourney(journey, { type: 'rename', name: 'x' }, tenant)).toEqual({
            ok: false,
            reason: 'platformOnly',
        });
        expect(
            editJourney(journey, { type: 'addStep', phase: 'departure', step: { kind: 'message' }, id: 'm' }, platform),
        ).toEqual({ ok: false, reason: 'againstTheRules' });
        expect(
            editJourney(journey, { type: 'removeStep', phase: 'departure', stepId: idOf(journey, 'email') }, agency),
        ).toEqual({ ok: false, reason: 'phaseOfHigherLevel' });
    });

    it('lets only the platform create, copy and delete journeys and route topics', () => {
        const all = [journey];
        expect(editJourneys(all, { type: 'create', conversationType: 'AGENCY_COUNSELLING', id: 'n' }, tenant).ok).toBe(
            false,
        );
        expect(editJourneys(all, { type: 'duplicate', sourceId: 'j1', id: 'c', name: 'Kopie' }, agency).ok).toBe(false);
        expect(editJourneys(all, { type: 'delete', journeyId: 'j1' }, tenant).ok).toBe(false);
        expect(editJourneys(all, { type: 'assignRegistration', journeyId: 'j1', topicId: 1 }, tenant).ok).toBe(false);
        expect(editJourneys(all, { type: 'assignRegistration', journeyId: 'j1', topicId: 1 }, platform).ok).toBe(true);
    });

    it('refuses a registration route for a conversation type without one', () => {
        const chat = standardJourney('LIVE_CHAT', 'c', 1);
        expect(editJourneys([chat], { type: 'assignRegistration', journeyId: 'c', topicId: 1 }, platform).ok).toBe(
            false,
        );
    });

    it('keeps the kind and building block of a step the step dialog returns', () => {
        const email = journey.phases.departure.find((step) => step.core === 'email');
        if (!email) throw new Error('no e-mail step');
        expect(
            editJourney(
                journey,
                { type: 'replaceStep', phase: 'departure', step: { ...email, core: 'postcode' } },
                platform,
            ).ok,
        ).toBe(false);
        expect(
            editJourney(
                journey,
                { type: 'replaceStep', phase: 'departure', step: { ...email, title: { de: 'Mail' } } },
                platform,
            ).ok,
        ).toBe(true);
    });

    it('never yields an order the registration cannot run: the Beratungsstelle goes along with the postcode', () => {
        const steps = journey.phases.departure;
        const agencyAt = steps.findIndex((step) => step.core === 'agency');
        const postcode = idOf(journey, 'postcode');
        const result = editJourney(
            journey,
            { type: 'moveStep', phase: 'departure', stepId: postcode, toIndex: agencyAt },
            platform,
        );
        expect(result.ok).toBe(true);
        const moved = result.ok ? result.value.phases.departure : [];
        const at = moved.findIndex((step) => step.id === postcode);
        expect(moved[at + 1].core).toBe('agency');
    });
});

describe('a Träger or Beratungsstelle changes its own layer, never the platform journey', () => {
    const base = [mail()];
    const withQuestion = (journeys: Journey[], context: EditingContext, id: string) => {
        const result = editJourneys(
            journeys,
            {
                type: 'edit',
                journeyId: 'j1',
                command: { type: 'addStep', phase: 'flight', step: { kind: 'question' }, id },
            },
            context,
        );
        if (!result.ok) throw new Error(result.reason);
        return result.value;
    };

    it('stores only the changed phase as the Träger layer', () => {
        const edited = withQuestion(base, tenant, 'tq');
        const layers = layersFrom(edited, base, 'tenant', 'traeger-1');
        expect(layers).toHaveLength(1);
        expect(Object.keys(layers[0].phases)).toEqual(['flight']);
        expect(base[0].phases.flight.some((step) => step.id === 'tq')).toBe(false);
    });

    it('shows the Beratungsstelle the platform journey with the Träger layer and its own on top', () => {
        const tenantLayers = layersFrom(withQuestion(base, tenant, 'tq'), base, 'tenant', 't1');
        const inherited = inheritedJourneys(base, tenantLayers, 'agency');
        const agencyLayers = layersFrom(withQuestion(inherited, agency, 'aq'), inherited, 'agency', 'a1');
        const seen = effectiveJourneys(base, [...agencyLayers, ...tenantLayers])[0].phases.flight.map(
            (step) => step.id,
        );
        expect(seen).toContain('tq');
        expect(seen).toContain('aq');
        expect(effectiveJourneys(base, tenantLayers)[0].phases.flight.map((step) => step.id)).not.toContain('aq');
    });

    it('drops a phase put back to what the level inherits', () => {
        const edited = withQuestion(base, tenant, 'tq');
        const back = editJourneys(
            edited,
            { type: 'edit', journeyId: 'j1', command: { type: 'removeStep', phase: 'flight', stepId: 'tq' } },
            tenant,
        );
        if (!back.ok) throw new Error(back.reason);
        expect(layersFrom(back.value, base, 'tenant', 't1')).toEqual([]);
    });
});
