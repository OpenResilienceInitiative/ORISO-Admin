import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Add from '@mui/icons-material/Add';
import CallSplit from '@mui/icons-material/CallSplit';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { M3Select } from '../M3Select';
import { IconButton } from '../IconButton';
import { ToggleRow } from '../ToggleRow';
import { M3RichTextEditor } from '../FormPluginEditor/M3RichTextEditor';
import { MODULE_SOURCE_LANGUAGE, type LangMap } from '../ConversationModules/conversationModule';
import {
    FIXED_TRIGGERS,
    RATING_TYPES,
    SCALES,
    isMustStep,
    markChecked,
    NORMAL_LABEL,
    textEntries,
    scaleOf,
    triggersFor,
    withScale,
    withRatingType,
    type JourneyPhase,
    type JourneyStep,
    type PanelAspect,
    type RatingItem,
    type JourneyTrigger,
    type RatingType,
    type ScaleId,
} from './journey';
import { KIND_ICONS } from './AddStepDialog';
import { useGreetingTexts } from './GreetingTexts';
import { BlockProfileCard } from './BlockProfileCard';
import { nextId } from './ids';
import { JourneyQuestionsEditor } from './JourneyQuestionsEditor';
import { LanguageTabs } from './LanguageTabs';
import { blockContext, stepTitle } from './stepText';
import { OriginalLine, TranslatableField, type TextChange } from './TranslatableField';
import { TEXT_LIMITS } from './journeyTextLimits';
import { TranslationPill } from './TranslationPill';
import {
    applyTranslationFill,
    requestStepTranslation,
    translateText,
    type KeywordSuggester,
    type TranslationFill,
    type Translator,
} from './journeyTranslation';
import { BlockDialog } from './BlockDialog';
import type { ProfileView } from './ProfileDialog';
import { SearchPill } from './SearchPill';
import { getTranslationErrorKey } from '../Tenants/LegalSettings/utils/translationErrors';
import { useDiscardGuard } from './useDiscardGuard';
import styles from './styles.module.scss';

export interface StepContext {
    /** "Reise #2 · Schulden ausführlich" */
    journey: string;
    /** 1-based position in the phase. */
    position: number;
}

interface StepDialogProps {
    step: JourneyStep;
    phase: JourneyPhase;
    /** Where the step sits, for the line under the title. */
    context?: StepContext;
    /** Machine translation through the Admin endpoint; without it no translation is offered. */
    translator?: Translator;
    /** Suggests search terms (ORISO-Admin#1562); without it none are offered. */
    suggester?: KeywordSuggester;
    /** The language the dialog opens in (stories); the original otherwise. */
    initialLanguage?: string;
    onApply: (step: JourneyStep) => void;
    /** Applies the step and splits it into one step per question. */
    onSplit?: (step: JourneyStep) => void;
    onClose: () => void;
}

const popupContainer = (node: HTMLElement) => node.parentElement ?? document.body;

/** What a block is for, in the words of the add-step list. */
const aboutKey = (step: JourneyStep) => {
    if (step.kind === 'core' && step.core) return `journeys.coreHelp.${step.core}`;
    if (step.kind === 'addon' && step.addon) return `journeys.addonHelp.${step.addon}`;
    return `journeys.kindHelp.${step.kind}`;
};

/**
 * One step in its own dialog: where it sits, what the block is for, its texts in every language
 * (always with the original beside them), then what the kind holds. A core element or add-on
 * brings its behaviour from the platform; only its wording is edited.
 */
export const StepDialog = ({
    step,
    phase,
    context,
    translator,
    suggester,
    initialLanguage = MODULE_SOURCE_LANGUAGE,
    onApply,
    onSplit,
    onClose,
}: StepDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<JourneyStep>(step);
    const guard = useDiscardGuard(draft, step, onClose);
    const [language, setLanguage] = useState<string>(initialLanguage);
    const [translationError, setTranslationError] = useState<string>();
    const [translating, setTranslating] = useState(false);
    const [profileOpen, setProfileOpen] = useState<ProfileView>();
    const greetingTexts = useGreetingTexts();
    const isGreeting = step.kind === 'core' && step.core === 'agencyGreeting';

    /** The step as it is now, for answers that arrive later. */
    const latest = useRef(draft);
    latest.current = draft;

    const runTranslation = async (job: () => Promise<TranslationFill>) => {
        setTranslationError(undefined);
        try {
            const fill = await job();
            setDraft((current) => applyTranslationFill(current, fill));
        } catch (error) {
            setTranslationError(getTranslationErrorKey(error));
        }
    };

    /**
     * One field into the language being edited. The answer is written only while the field still
     * holds what it held when asked, and only if the field still exists; a failure is named once
     * above the fields.
     */
    const translateAt = (path: string) => {
        if (!translator) return undefined;
        return async () => {
            const field = textEntries(latest.current).find((entry) => entry.path === path)?.text;
            const source = field?.[MODULE_SOURCE_LANGUAGE];
            if (!source) return;
            const target = language;
            const expected = field?.[target] ?? '';
            await runTranslation(async () => ({
                texts: [{ path, language: target, text: await translateText(translator, source, target), expected }],
            }));
        };
    };
    const translateAllMissing = translator
        ? async () => {
              setTranslating(true);
              await runTranslation(() => requestStepTranslation(latest.current, translator));
              setTranslating(false);
          }
        : undefined;

    const isMachine = (draft.machine ?? []).includes(language);
    const fromPlatform = draft.kind === 'core' || draft.kind === 'addon';
    const asksSomething = draft.kind === 'question' || draft.kind === 'rating';
    const unit = t(phase === 'departure' ? 'journeys.step.screen' : 'journeys.step.message');

    /** Applies a change and keeps track of which languages a machine wrote. */
    const change = (patch: Partial<JourneyStep>, how: TextChange = 'typed') =>
        setDraft((current) => {
            const next = { ...current, ...patch };
            if (how === 'machine' && !(next.machine ?? []).includes(language)) {
                next.machine = [...(next.machine ?? []), language];
            }
            return next;
        });
    const field = (key: 'title' | 'description', label: string) => (
        <TranslatableField
            label={label}
            value={draft[key]}
            language={language}
            machine={isMachine}
            onTranslate={translateAt(key)}
            onChange={(next, how) => change({ [key]: next }, how)}
            testId={`step-field-${key}`}
            maxLength={key === 'title' ? TEXT_LIMITS.stepTitle : TEXT_LIMITS.stepDescription}
        />
    );
    const inLanguage = (text: LangMap | undefined, value: string): LangMap => ({ ...text, [language]: value });

    const setRating = (id: string, patch: Partial<RatingItem>, how: TextChange = 'typed') =>
        change({ ratings: draft.ratings?.map((rating) => (rating.id === id ? { ...rating, ...patch } : rating)) }, how);
    const setRatingType = (rating: RatingItem, type: RatingType) => setRating(rating.id, withRatingType(rating, type));
    const setAspect = (id: string, patch: Partial<PanelAspect>, how: TextChange = 'typed') =>
        change({ aspects: draft.aspects?.map((aspect) => (aspect.id === id ? { ...aspect, ...patch } : aspect)) }, how);

    const ratingLabel = (rating: RatingItem, key: 'minLabel' | 'midLabel' | 'maxLabel', label: string) => (
        <TranslatableField
            label={label}
            value={rating[key]}
            language={language}
            machine={isMachine}
            onTranslate={translateAt(`rating:${rating.id}:${key}`)}
            onChange={(next, how) => setRating(rating.id, { [key]: next }, how)}
        />
    );

    return (
        <>
            <Modal
                icon={KIND_ICONS[draft.kind]}
                title={stepTitle(draft, MODULE_SOURCE_LANGUAGE, t)}
                description={
                    context
                        ? t('journeys.stepDialog.context', {
                              journey: context.journey,
                              phase: t(`journeys.phase.${phase}`),
                              position: context.position,
                              unit,
                          })
                        : undefined
                }
                descriptionFullWidth
                width={720}
                zIndex={1200}
                footer={
                    <div className={styles.footer}>
                        <M3Button variant="text" onClick={onClose}>
                            {t('journeys.action.cancel')}
                        </M3Button>
                        <M3Button variant="filled" disabled={translating} onClick={() => onApply(draft)}>
                            {t('journeys.action.apply')}
                        </M3Button>
                    </div>
                }
                onClose={onClose}
                onDismiss={guard.onDismiss}
                wrapperTestId="journey-step-dialog"
                scrollableBody
            >
                <div className={styles.dialogBody}>
                    {guard.confirm}
                    <BlockProfileCard
                        kind={t(isMustStep(draft) ? 'journeys.kind.must' : `journeys.kind.${draft.kind}`)}
                        help={t(aboutKey(draft))}
                        profile={draft.profile}
                        onEdit={() => setProfileOpen('card')}
                    >
                        {fromPlatform && <p>{t('journeys.stepDialog.fromPlatform')}</p>}
                        {isMustStep(draft) && <p>{t('journeys.stepDialog.must')}</p>}
                        {draft.kind === 'question' && (
                            <p>
                                {t(
                                    `journeys.stepDialog.questionsTogether.${
                                        phase === 'departure' ? 'screen' : 'message'
                                    }`,
                                )}
                            </p>
                        )}
                        {draft.kind === 'question' && (draft.questions?.length ?? 0) > 1 && onSplit && (
                            <div>
                                <M3Button variant="outlined" icon={<CallSplit />} onClick={() => onSplit(draft)}>
                                    {t('journeys.stepDialog.split', { count: draft.questions?.length ?? 0 })}
                                </M3Button>
                            </div>
                        )}
                    </BlockProfileCard>

                    <div className={styles.toolbar}>
                        <LanguageTabs step={draft} value={language} onChange={setLanguage} />
                        <TranslationPill
                            step={draft}
                            busy={translating}
                            onTranslate={translateAllMissing}
                            onMarkChecked={(code) => setDraft((current) => markChecked(current, code))}
                        />
                        <SearchPill profile={draft.profile} onOpen={() => setProfileOpen('terms')} />
                    </div>

                    {translationError && (
                        <div className={styles.warning} role="alert" data-testid="journey-translation-error">
                            <p>{t(translationError)}</p>
                        </div>
                    )}

                    {field('title', t('journeys.stepDialog.title'))}
                    {field('description', t('journeys.stepDialog.descriptionForSeekers'))}

                    {isGreeting && greetingTexts && (
                        <section
                            className={styles.greetingTexts}
                            aria-labelledby="journey-greeting-texts-title"
                            data-testid="journey-greeting-texts"
                        >
                            <h3 id="journey-greeting-texts-title" className={styles.noticeTitle}>
                                {t('journeys.greetingTexts.title')}
                            </h3>
                            <p className={styles.help}>{t('journeys.greetingTexts.help')}</p>
                            {greetingTexts}
                        </section>
                    )}

                    {draft.core && FIXED_TRIGGERS[draft.core] && (
                        <p className={styles.help}>
                            {t('journeys.trigger.fixed', {
                                trigger: t(`journeys.trigger.${FIXED_TRIGGERS[draft.core]}`),
                            })}
                        </p>
                    )}

                    {(asksSomething || draft.kind === 'message') && triggersFor(phase).length > 0 && (
                        <M3Select<JourneyTrigger>
                            aria-label={t('journeys.trigger.label')}
                            value={draft.trigger ?? triggersFor(phase)[0]}
                            options={triggersFor(phase).map((trigger) => ({
                                value: trigger,
                                label: t(`journeys.trigger.${trigger}`),
                            }))}
                            onChange={(trigger: JourneyTrigger) => change({ trigger })}
                            getPopupContainer={popupContainer}
                        />
                    )}

                    {draft.kind === 'question' && (
                        <JourneyQuestionsEditor
                            questions={draft.questions ?? []}
                            language={language}
                            machine={draft.machine ?? []}
                            translateAt={translateAt}
                            onChange={(questions, how) => change({ questions }, how)}
                        />
                    )}

                    {draft.kind === 'rating' && (
                        <>
                            {draft.ratings?.map((rating, index) => (
                                <section
                                    key={rating.id}
                                    className={styles.block}
                                    aria-labelledby={`${rating.id}-heading`}
                                    data-testid={`journey-rating-${rating.id}`}
                                >
                                    <div className={styles.blockHeader}>
                                        <h3 className={styles.blockTitle} id={`${rating.id}-heading`}>
                                            {t('journeys.rating.number', { number: index + 1 })}
                                        </h3>
                                        <IconButton
                                            icon={<DeleteOutline />}
                                            ariaLabel={t('journeys.rating.remove')}
                                            onClick={() =>
                                                change({
                                                    ratings: draft.ratings?.filter((entry) => entry.id !== rating.id),
                                                })
                                            }
                                        />
                                    </div>
                                    <TranslatableField
                                        label={t('journeys.rating.label')}
                                        value={rating.label}
                                        language={language}
                                        machine={isMachine}
                                        onTranslate={translateAt(`rating:${rating.id}:label`)}
                                        onChange={(next, how) => setRating(rating.id, { label: next }, how)}
                                    />
                                    <div className={styles.fieldRow}>
                                        <M3Select<RatingType>
                                            aria-label={t('journeys.rating.type')}
                                            value={rating.type}
                                            options={RATING_TYPES.map((type) => ({
                                                value: type,
                                                label: t(`journeys.rating.type.${type}`),
                                            }))}
                                            onChange={(type: RatingType) => setRatingType(rating, type)}
                                            getPopupContainer={popupContainer}
                                        />
                                        {rating.type === 'range' && (
                                            <M3Select<ScaleId>
                                                aria-label={t('journeys.rating.scale')}
                                                value={scaleOf(rating) ?? 'minusFiveToFive'}
                                                options={(Object.keys(SCALES) as ScaleId[]).map((scale) => ({
                                                    value: scale,
                                                    label: t(`journeys.rating.scaleName.${scale}`),
                                                }))}
                                                onChange={(scale: ScaleId) =>
                                                    setRating(rating.id, withScale(rating, scale))
                                                }
                                                getPopupContainer={popupContainer}
                                            />
                                        )}
                                    </div>
                                    {rating.type === 'range' && (
                                        <div className={styles.fieldRow}>
                                            {ratingLabel(
                                                rating,
                                                'minLabel',
                                                t('journeys.rating.minLabel', {
                                                    value: rating.min < 0 ? `−${-rating.min}` : rating.min,
                                                }),
                                            )}
                                            {rating.midLabel &&
                                                ratingLabel(rating, 'midLabel', t('journeys.rating.midLabel'))}
                                            {ratingLabel(
                                                rating,
                                                'maxLabel',
                                                t('journeys.rating.maxLabel', {
                                                    value: rating.min < 0 ? `+${rating.max}` : rating.max,
                                                }),
                                            )}
                                        </div>
                                    )}
                                    <ToggleRow
                                        label={t('journeys.rating.required')}
                                        checked={rating.required}
                                        onCheckedChange={(required) => setRating(rating.id, { required })}
                                    />
                                </section>
                            ))}
                            <div>
                                <M3Button
                                    variant="outlined"
                                    icon={<Add />}
                                    onClick={() =>
                                        change({
                                            ratings: [
                                                ...(draft.ratings ?? []),
                                                {
                                                    id: nextId('rating'),
                                                    type: 'range',
                                                    label: {},
                                                    ...SCALES.minusFiveToFive,
                                                    midLabel: { ...NORMAL_LABEL },
                                                    required: false,
                                                    version: 1,
                                                },
                                            ],
                                        })
                                    }
                                >
                                    {t('journeys.rating.add')}
                                </M3Button>
                            </div>
                        </>
                    )}

                    {draft.kind === 'panel' && (
                        <>
                            <ToggleRow
                                label={t('conversationModules.section.startsCollapsed')}
                                checked={draft.display === 'collapsed'}
                                onCheckedChange={(collapsed) => change({ display: collapsed ? 'collapsed' : 'open' })}
                            />
                            {draft.aspects?.map((aspect, index) => (
                                <section
                                    key={aspect.id}
                                    className={styles.block}
                                    aria-labelledby={`${aspect.id}-heading`}
                                    data-testid={`journey-aspect-${aspect.prototypeId ?? aspect.id}`}
                                >
                                    <div className={styles.blockHeader}>
                                        <h3 className={styles.blockTitle} id={`${aspect.id}-heading`}>
                                            {t('journeys.aspect.number', { number: index + 1 })}
                                            {aspect.safety && (
                                                <>
                                                    {' '}
                                                    <span className={`${styles.chip} ${styles.chipMust}`}>
                                                        {t('conversationModules.safety.badge')}
                                                    </span>
                                                </>
                                            )}
                                        </h3>
                                        <IconButton
                                            icon={<DeleteOutline />}
                                            ariaLabel={t('journeys.aspect.remove')}
                                            onClick={() =>
                                                change({
                                                    aspects: draft.aspects?.filter((entry) => entry.id !== aspect.id),
                                                })
                                            }
                                        />
                                    </div>
                                    <TranslatableField
                                        label={t('journeys.stepDialog.title')}
                                        value={aspect.title}
                                        language={language}
                                        machine={isMachine}
                                        onTranslate={translateAt(`aspect:${aspect.id}:title`)}
                                        onChange={(next, how) => setAspect(aspect.id, { title: next }, how)}
                                    />
                                    <M3RichTextEditor
                                        key={`${aspect.id}-${language}`}
                                        title={t('conversationModules.section.body')}
                                        value={aspect.body[language] ?? ''}
                                        contentLanguage={language}
                                        languageSlot={<span />}
                                        fluid
                                        hideHeader
                                        plainText
                                        enableAnchors={false}
                                        versionLabel={t('legal.m3Editor.versionLatest')}
                                        onChange={(html: string) =>
                                            setAspect(aspect.id, { body: inLanguage(aspect.body, html) })
                                        }
                                    />
                                    <OriginalLine
                                        value={aspect.body}
                                        language={language}
                                        machine={isMachine}
                                        onTranslate={translateAt(`aspect:${aspect.id}:body`)}
                                        onChange={(next, how) => setAspect(aspect.id, { body: next }, how)}
                                    />
                                </section>
                            ))}
                            <div>
                                <M3Button
                                    variant="outlined"
                                    icon={<Add />}
                                    onClick={() =>
                                        change({
                                            aspects: [
                                                ...(draft.aspects ?? []),
                                                { id: nextId('aspect'), title: {}, body: {} },
                                            ],
                                        })
                                    }
                                >
                                    {t('journeys.aspect.add')}
                                </M3Button>
                            </div>
                        </>
                    )}

                    {draft.kind === 'message' && (
                        <>
                            <M3RichTextEditor
                                key={`body-${language}`}
                                title={t('conversationModules.section.body')}
                                value={draft.body?.[language] ?? ''}
                                contentLanguage={language}
                                languageSlot={<span />}
                                fluid
                                hideHeader
                                plainText
                                enableAnchors={false}
                                versionLabel={t('legal.m3Editor.versionLatest')}
                                onChange={(html: string) => change({ body: inLanguage(draft.body, html) })}
                            />
                            <OriginalLine
                                value={draft.body}
                                language={language}
                                machine={isMachine}
                                onTranslate={translateAt('body')}
                                onChange={(next, how) => change({ body: next }, how)}
                            />
                        </>
                    )}
                </div>
            </Modal>
            {profileOpen && (
                <BlockDialog
                    view={profileOpen}
                    title={stepTitle(draft, MODULE_SOURCE_LANGUAGE, t)}
                    context={context && blockContext(draft, { ...context, phase }, t)}
                    profile={draft.profile}
                    defaultAuthor={t('journeys.profile.platform')}
                    translator={translator}
                    suggester={suggester}
                    onApply={(profile) => {
                        change({ profile });
                        setProfileOpen(undefined);
                    }}
                    onClose={() => setProfileOpen(undefined)}
                />
            )}
        </>
    );
};
