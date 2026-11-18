import type { TFunction } from 'i18next';
import { stepContentCount, type Journey, type JourneyStep } from './journey';

const plain = (html: string | undefined) =>
    (html ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

/** The title an editor sees for a step, in the language being edited, falling back to German. */
export const stepTitle = (step: JourneyStep, language: string, t: TFunction): string =>
    step.title[language] || step.title.de || t(`journeys.kind.${step.kind}`);

/** One line under the title: the description, or what the step holds. */
export const stepSummary = (step: JourneyStep, language: string, t: TFunction): string => {
    const { questions, ratings, aspects } = stepContentCount(step);
    const parts: string[] = [];
    if (step.kind === 'question') parts.push(t('journeys.step.questions', { count: questions }));
    if (step.kind === 'rating') parts.push(t('journeys.step.ratings', { count: ratings }));
    if (step.kind === 'panel') {
        parts.push(t('journeys.step.aspects', { count: aspects }));
        if (step.display === 'collapsed') parts.push(t('journeys.step.collapsed'));
    }
    if (step.trigger === 'afterFirstReply' || step.trigger === 'manual')
        parts.push(t(`journeys.trigger.${step.trigger}`));
    const text = step.description[language] || step.description.de || plain(step.body?.[language] || step.body?.de);
    return [parts.join(' · '), text].filter(Boolean).join(' — ');
};

/** "Journey #3 · U25", or just the number while the journey has no name. */
export const journeyLabel = (journey: Journey, t: TFunction): string =>
    journey.name
        ? t('journeys.journey.label', { number: journey.number, name: journey.name })
        : t('journeys.journey.number', { number: journey.number });
