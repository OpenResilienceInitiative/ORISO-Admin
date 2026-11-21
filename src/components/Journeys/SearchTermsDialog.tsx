import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Add from '@mui/icons-material/Add';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import { M3Button } from '../M3Button';
import { IconButton } from '../IconButton';
import { M3Tooltip } from '../M3Tooltip';
import { MODULE_LANGUAGES, MODULE_SOURCE_LANGUAGE } from '../ConversationModules/conversationModule';
import { getTranslationErrorKey } from '../Tenants/LegalSettings/utils/translationErrors';
import { KEYWORD_TARGET, addKeywords, emptyProfile, keywordsIn, removeKeyword, type BlockProfile } from './journey';
import { translateKeywords, type KeywordSuggester, type Translator } from './journeyTranslation';
import { BlockDialogFrame, type BlockDialogProps } from './ProfileDialog';
import { LanguageRadioGroup } from './LanguageTabs';
import { TranslateIcon } from './TranslateIcon';
import { useDiscardGuard } from './useDiscardGuard';
import styles from './styles.module.scss';

interface SearchTermsDialogProps extends BlockDialogProps {
    translator?: Translator;
    suggester?: KeywordSuggester;
}

/**
 * The words under which other editors find a block in the library, kept per language: typed by
 * hand, translated from the German ones, or picked from suggestions in that language. Two groups:
 * the block's terms, and the suggestions with their own actions.
 */
export const SearchTermsDialog = ({
    title,
    context,
    profile,
    defaultAuthor,
    translator,
    suggester,
    onApply,
    onClose,
}: SearchTermsDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<BlockProfile>(profile ?? emptyProfile(defaultAuthor));
    const [initial] = useState(draft);
    const guard = useDiscardGuard(draft, initial, onClose);
    const [language, setLanguage] = useState<string>(MODULE_SOURCE_LANGUAGE);
    const [term, setTerm] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>();
    const [busy, setBusy] = useState<'translate' | 'suggest'>();
    const [error, setError] = useState<string>();

    const terms = keywordsIn(draft, language);
    const languageName = t(`language.${language}`, language);
    const germanTerms = keywordsIn(draft, MODULE_SOURCE_LANGUAGE);
    const translateLabel = t('journeys.keywords.translateAll');

    const addTerm = () => {
        if (!term.trim()) return;
        setDraft((current) => addKeywords(current, language, [term]));
        setTerm('');
    };
    const switchLanguage = (code: string) => {
        setLanguage(code);
        setSuggestions(undefined);
        setTerm('');
    };
    const take = (entries: string[]) => setDraft((current) => addKeywords(current, language, entries));

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
    // Answers arrive later: they are added to the terms as they are then, and suggestions for a
    // language the editor has meanwhile left are dropped instead of landing in the wrong one.
    const shownLanguage = useRef(language);
    shownLanguage.current = language;
    const translateAll = () =>
        run('translate', async () => {
            if (!translator) return;
            const others = MODULE_LANGUAGES.filter((code) => code !== MODULE_SOURCE_LANGUAGE);
            const found = await translateKeywords(germanTerms, others, translator);
            setDraft((current) =>
                Object.entries(found).reduce(
                    (next, [code, entries]) => addKeywords(next, code, entries ?? []),
                    current,
                ),
            );
        });
    const suggest = () =>
        run('suggest', async () => {
            if (!suggester) return;
            const asked = language;
            const found = await suggester({ language: asked, title, about: draft.about, existing: terms });
            if (shownLanguage.current !== asked) return;
            setSuggestions(found);
        });
    const open = suggestions?.filter((entry) => !terms.some((known) => known.toLowerCase() === entry.toLowerCase()));

    return (
        <BlockDialogFrame
            icon={<SearchOutlined />}
            title={t('journeys.keywordsDialog.title', { name: title })}
            context={context}
            testId="journey-search-terms-dialog"
            onApply={() => onApply(draft)}
            onClose={onClose}
            onDismiss={guard.onDismiss}
        >
            {guard.confirm}
            <p className={styles.help}>{t('journeys.keywords.help', { name: title, count: KEYWORD_TARGET })}</p>

            <div className={styles.termLanguages}>
                <LanguageRadioGroup
                    label={t('journeys.keywords.language')}
                    value={language}
                    onChange={switchLanguage}
                    options={MODULE_LANGUAGES.map((code) => {
                        const count = keywordsIn(draft, code).length;
                        const covered = count >= KEYWORD_TARGET;
                        return {
                            language: code,
                            state: t('journeys.keywords.count', { count }),
                            mark: covered ? <Check /> : count,
                            className: covered ? styles.languageTab_checked : styles.languageTab_missing,
                        };
                    })}
                />
                {translator && (
                    <M3Tooltip text={translateLabel} nameOnly portal>
                        <IconButton
                            icon={<TranslateIcon />}
                            ariaLabel={translateLabel}
                            className={classNames({ [styles.busyIcon]: busy === 'translate' })}
                            disabled={germanTerms.length === 0 || busy === 'translate'}
                            onClick={translateAll}
                        />
                    </M3Tooltip>
                )}
            </div>

            {error && (
                <div className={styles.warning} role="alert" data-testid="journey-keywords-error">
                    <p>{t(error)}</p>
                </div>
            )}

            <section className={styles.termGroup} aria-labelledby="search-terms-heading">
                <h3 className={styles.termGroupTitle} id="search-terms-heading">
                    {t('journeys.keywords.in', { language: languageName })}
                </h3>
                <ul
                    className={styles.keywordCloud}
                    aria-labelledby="search-terms-heading"
                    data-testid="journey-keywords"
                >
                    {terms.map((entry) => (
                        <li key={entry} className={styles.keyword}>
                            {entry}
                            <button
                                type="button"
                                className={styles.chipRemove}
                                aria-label={t('journeys.keywords.remove', { term: entry })}
                                onClick={() => setDraft((current) => removeKeyword(current, language, entry))}
                            >
                                <Close aria-hidden />
                            </button>
                        </li>
                    ))}
                    <li className={styles.keywordAdd}>
                        <Add aria-hidden />
                        <input
                            type="text"
                            value={term}
                            placeholder={t('journeys.keywords.addPlaceholder')}
                            aria-label={t('journeys.keywords.add', { language: languageName })}
                            onChange={(event) => setTerm(event.target.value)}
                            onBlur={addTerm}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter') return;
                                event.preventDefault();
                                addTerm();
                            }}
                        />
                    </li>
                </ul>
            </section>

            {suggester && (
                <section
                    className={styles.termGroup}
                    aria-labelledby="search-suggestions-heading"
                    data-testid="journey-keyword-suggestions"
                >
                    <div className={styles.termGroupHead}>
                        <h3 className={styles.termGroupTitle} id="search-suggestions-heading">
                            <AutoAwesomeOutlined aria-hidden />
                            {t('journeys.keywords.suggestions', { language: languageName })}
                        </h3>
                        {open && open.length > 0 && (
                            <M3Button variant="text" onClick={() => take(open)}>
                                {t('journeys.keywords.takeAll')}
                            </M3Button>
                        )}
                        <M3Button variant="tonal" loading={busy === 'suggest'} onClick={suggest}>
                            {t(suggestions ? 'journeys.keywords.suggestMore' : 'journeys.keywords.suggest')}
                        </M3Button>
                    </div>
                    {!suggestions && (
                        <p className={styles.help}>{t('journeys.keywords.suggestHelp', { language: languageName })}</p>
                    )}
                    {open?.length === 0 && <p className={styles.help}>{t('journeys.keywords.noSuggestions')}</p>}
                    {open && open.length > 0 && (
                        <ul className={styles.keywordCloud}>
                            {open.map((entry) => (
                                <li key={entry}>
                                    <button
                                        type="button"
                                        className={classNames(styles.keyword, styles.keywordSuggestion)}
                                        aria-label={t('journeys.keywords.take', { term: entry })}
                                        onClick={() => take([entry])}
                                    >
                                        <Add aria-hidden />
                                        {entry}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </BlockDialogFrame>
    );
};
