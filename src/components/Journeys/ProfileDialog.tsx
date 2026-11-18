import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Add from '@mui/icons-material/Add';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import SellOutlined from '@mui/icons-material/SellOutlined';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { IconButton } from '../IconButton';
import { FilterChip } from '../FilterChip';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { MODULE_LANGUAGES, MODULE_SOURCE_LANGUAGE } from '../ConversationModules/conversationModule';
import { getTranslationErrorKey } from '../Tenants/LegalSettings/utils/translationErrors';
import {
    AUDIENCES,
    KEYWORD_TARGET,
    addKeywords,
    emptyProfile,
    keywordsIn,
    removeKeyword,
    type Audience,
    type BlockProfile,
} from './journey';
import { translateKeywords, type KeywordSuggester, type Translator } from './journeyTranslation';
import { TranslateIcon } from './TranslateIcon';
import styles from './styles.module.scss';

interface ProfileDialogProps {
    /** The block's title, for the dialog title and for the suggestions. */
    title: string;
    profile?: BlockProfile;
    defaultAuthor: string;
    translator?: Translator;
    suggester?: KeywordSuggester;
    onApply: (profile: BlockProfile) => void;
    onClose: () => void;
}

const codeOf = (language: string) => (language === 'de@informal' ? 'DE du' : language.toUpperCase());

/**
 * The profile card of a block and its search terms, for other editors and the block library. The
 * search terms are kept per language: typed by hand, translated from German, or picked from
 * suggestions in that language. Never shown to the advice seeker.
 */
export const ProfileDialog = ({
    title,
    profile,
    defaultAuthor,
    translator,
    suggester,
    onApply,
    onClose,
}: ProfileDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<BlockProfile>(profile ?? emptyProfile(defaultAuthor));
    const [language, setLanguage] = useState<string>(MODULE_SOURCE_LANGUAGE);
    const [term, setTerm] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [busy, setBusy] = useState<'translate' | 'suggest'>();
    const [error, setError] = useState<string>();

    const set = (patch: Partial<BlockProfile>) => setDraft((current) => ({ ...current, ...patch }));
    const terms = keywordsIn(draft, language);
    const languageName = t(`language.${language}`, language);
    const otherLanguages = MODULE_LANGUAGES.filter((code) => code !== MODULE_SOURCE_LANGUAGE);
    const germanTerms = keywordsIn(draft, MODULE_SOURCE_LANGUAGE);

    const addTerm = () => {
        setDraft((current) => addKeywords(current, language, [term]));
        setTerm('');
    };
    const switchLanguage = (code: string) => {
        setLanguage(code);
        setSuggestions([]);
        setTerm('');
    };

    const run = async (kind: 'translate' | 'suggest', job: () => Promise<void>) => {
        setBusy(kind);
        setError(undefined);
        try {
            await job();
        } catch (failure) {
            setError(getTranslationErrorKey(failure));
        } finally {
            setBusy(undefined);
        }
    };
    const translateAll = () =>
        run('translate', async () => {
            if (!translator) return;
            const keywords = await translateKeywords(draft.keywords, otherLanguages, translator);
            setDraft((current) => ({ ...current, keywords }));
        });
    const suggest = () =>
        run('suggest', async () => {
            if (!suggester) return;
            const found = await suggester({ language, title, about: draft.about, existing: terms });
            setSuggestions(found.filter((entry) => !terms.includes(entry)));
        });

    return (
        <Modal
            icon={<SellOutlined />}
            title={t('journeys.profileDialog.title', { name: title })}
            descriptionKey="journeys.profile.hint"
            descriptionFullWidth
            width={720}
            zIndex={1300}
            footer={
                <div className={styles.footer}>
                    <M3Button variant="text" onClick={onClose}>
                        {t('journeys.action.cancel')}
                    </M3Button>
                    <M3Button variant="filled" onClick={() => onApply(draft)}>
                        {t('journeys.action.apply')}
                    </M3Button>
                </div>
            }
            onClose={onClose}
            wrapperTestId="journey-profile-dialog"
            scrollableBody
        >
            <div className={styles.dialogBody}>
                <section className={styles.section} aria-labelledby="profile-card-heading">
                    <h3 className={styles.sectionTitle} id="profile-card-heading">
                        {t('journeys.profileDialog.card')}
                    </h3>
                    <FloatingLabelInput
                        label={t('journeys.profile.about')}
                        value={draft.about}
                        onChange={(event) => set({ about: event.target.value })}
                    />
                    <FloatingLabelInput
                        label={t('journeys.profile.goal')}
                        value={draft.goal}
                        onChange={(event) => set({ goal: event.target.value })}
                    />
                    <FloatingLabelInput
                        label={t('journeys.profile.author')}
                        value={draft.author}
                        onChange={(event) => set({ author: event.target.value })}
                    />
                    <span className={styles.chipsLabel} id="profile-audiences">
                        {t('journeys.profile.audiences')}
                    </span>
                    <div className={styles.looks} role="group" aria-labelledby="profile-audiences">
                        {AUDIENCES.map((audience: Audience) => (
                            <FilterChip
                                key={audience}
                                label={t(`journeys.audience.${audience}`)}
                                selected={draft.audiences.includes(audience)}
                                onChange={(on) =>
                                    set({
                                        audiences: on
                                            ? [...draft.audiences, audience]
                                            : draft.audiences.filter((entry) => entry !== audience),
                                    })
                                }
                            />
                        ))}
                    </div>
                </section>

                <section className={styles.section} aria-labelledby="profile-terms-heading">
                    <div className={styles.toolbar}>
                        <h3 className={styles.sectionTitle} id="profile-terms-heading">
                            {t('journeys.profile.keywords')}
                        </h3>
                        {translator && (
                            <M3Button
                                variant="text"
                                icon={<TranslateIcon />}
                                loading={busy === 'translate'}
                                disabled={germanTerms.length === 0}
                                onClick={translateAll}
                            >
                                {t('journeys.keywords.translateAll')}
                            </M3Button>
                        )}
                    </div>
                    <p className={styles.help}>{t('journeys.keywords.help', { count: KEYWORD_TARGET })}</p>
                    <div className={styles.languageTabs} role="radiogroup" aria-label={t('journeys.keywords.language')}>
                        {MODULE_LANGUAGES.map((code) => {
                            const count = keywordsIn(draft, code).length;
                            const covered = count >= KEYWORD_TARGET;
                            return (
                                <button
                                    key={code}
                                    type="button"
                                    role="radio"
                                    aria-checked={language === code}
                                    aria-label={`${codeOf(code)} – ${t(`language.${code}`, code)}, ${t(
                                        'journeys.keywords.count',
                                        { count },
                                    )}`}
                                    className={classNames(
                                        styles.languageTab,
                                        covered ? styles.languageTab_checked : styles.languageTab_missing,
                                        { [styles.languageTabOn]: language === code },
                                    )}
                                    onClick={() => switchLanguage(code)}
                                >
                                    {codeOf(code)}
                                    <span aria-hidden>{covered ? <Check /> : count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {error && (
                        <div className={styles.warning} role="alert" data-testid="journey-keywords-error">
                            <p>{t(error)}</p>
                        </div>
                    )}

                    <ul
                        className={styles.keywordCloud}
                        aria-label={t('journeys.keywords.in', { language: languageName })}
                        data-testid="journey-keywords"
                    >
                        {terms.length === 0 && <li className={styles.help}>{t('journeys.keywords.none')}</li>}
                        {terms.map((entry) => (
                            <li key={entry} className={styles.keyword}>
                                {entry}
                                <button
                                    type="button"
                                    className={styles.chipRemove}
                                    aria-label={t('journeys.profile.removeTag', { tag: entry })}
                                    onClick={() => setDraft((current) => removeKeyword(current, language, entry))}
                                >
                                    <Close aria-hidden />
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className={styles.tagInput}>
                        <FloatingLabelInput
                            label={t('journeys.keywords.add', { language: languageName })}
                            supportingText={t('journeys.profile.tagsHelp')}
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter') return;
                                event.preventDefault();
                                addTerm();
                            }}
                        />
                        <IconButton
                            icon={<Add />}
                            ariaLabel={t('journeys.profile.addTag')}
                            disabled={!term.trim()}
                            onClick={addTerm}
                        />
                        {suggester && (
                            <M3Button
                                variant="outlined"
                                icon={<AutoAwesomeOutlined />}
                                loading={busy === 'suggest'}
                                onClick={suggest}
                            >
                                {t('journeys.keywords.suggest')}
                            </M3Button>
                        )}
                    </div>

                    {suggestions.length > 0 && (
                        <div className={styles.section} data-testid="journey-keyword-suggestions">
                            <div className={styles.toolbar}>
                                <span className={styles.chipsLabel}>
                                    {t('journeys.keywords.suggestions', { language: languageName })}
                                </span>
                                <M3Button
                                    variant="text"
                                    onClick={() => {
                                        setDraft((current) => addKeywords(current, language, suggestions));
                                        setSuggestions([]);
                                    }}
                                >
                                    {t('journeys.keywords.takeAll')}
                                </M3Button>
                            </div>
                            <ul className={styles.keywordCloud}>
                                {suggestions.map((entry) => (
                                    <li key={entry}>
                                        <button
                                            type="button"
                                            className={classNames(styles.keyword, styles.keywordSuggestion)}
                                            aria-label={t('journeys.keywords.take', { term: entry })}
                                            onClick={() => {
                                                setDraft((current) => addKeywords(current, language, [entry]));
                                                setSuggestions((current) => current.filter((other) => other !== entry));
                                            }}
                                        >
                                            <Add aria-hidden />
                                            {entry}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            </div>
        </Modal>
    );
};
