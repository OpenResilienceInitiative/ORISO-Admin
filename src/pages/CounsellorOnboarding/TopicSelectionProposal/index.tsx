import { useMemo, useRef, useState } from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next, useTranslation } from 'react-i18next';
import { ConfigProvider, Form } from 'antd';
import deDE from 'antd/es/locale/de_DE';
import enGB from 'antd/es/locale/en_GB';
import { ThemeProvider } from '@mui/material/styles';
import { Modal } from '../../../components/Modal';
import { M3Button } from '../../../components/M3Button';
import { M3Checkbox } from '../../../components/M3Checkbox';
import { FilterChip } from '../../../components/FilterChip';
import { MuiFormField } from '../../../components/mui/MuiFormField';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import type { CounsellorTopicPermission } from '../../../api/counsellorOnboarding/counsellorOnboarding';
import { topics } from './fixtures';
import { resources } from './copy';
import styles from './styles.module.scss';

export interface TopicSelectionProposalProps {
    initialLanguage?: 'de' | 'en';
    initialOpen?: boolean;
    permission?: CounsellorTopicPermission;
    fixed?: boolean;
    requiredTopicIds?: number[];
    initialSelectedIds?: number[];
    initialStatus?: 'ready' | 'loading' | 'error' | 'empty';
}

const TopicSelection = ({
    initialOpen = false,
    permission = 'CREATE',
    fixed = false,
    requiredTopicIds = [],
    initialSelectedIds = [101],
    initialStatus = 'ready',
}: TopicSelectionProposalProps) => {
    const { t, i18n } = useTranslation('proposal');
    const language = i18n.resolvedLanguage === 'en' ? 'en' : 'de';
    const allowedTopics = permission === 'CREATE' ? topics : topics.filter((topic) => [101, 102].includes(topic.id));
    const lockedIds = fixed ? initialSelectedIds : requiredTopicIds;
    const initialSelection = [...new Set([...initialSelectedIds, ...lockedIds])].filter((id) =>
        allowedTopics.some((topic) => topic.id === id),
    );
    const [selected, setSelected] = useState(initialSelection);
    const [draft, setDraft] = useState(initialSelection);
    const [status, setStatus] = useState(initialStatus);
    const [open, setOpen] = useState(initialOpen);
    const [nameForm] = Form.useForm();
    const [searchForm] = Form.useForm();
    const query = (Form.useWatch('search', searchForm) ?? '') as string;
    const trigger = useRef<HTMLDivElement>(null);
    const policyHint = fixed
        ? 'fixed'
        : { NONE: 'single', SELECT_EXISTING: 'agencyOnly', CREATE: 'catalogue' }[permission];
    const selectedTopics = topics.filter((topic) => selected.includes(topic.id));
    const matches = allowedTopics.filter((topic) =>
        topic[language].toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language)),
    );
    const close = () => {
        setOpen(false);
        queueMicrotask(() => trigger.current?.querySelector('button')?.focus());
    };
    const toggle = (id: number) => {
        if (fixed || lockedIds.includes(id) || (permission === 'NONE' && lockedIds.length > 0)) return;
        setDraft((previous) => {
            if (previous.includes(id))
                return previous.length === 1 ? previous : previous.filter((value) => value !== id);
            if (permission === 'NONE') return [id];
            return [...previous, id];
        });
    };
    return (
        <ConfigProvider locale={language === 'en' ? enGB : deDE}>
            <main className={styles.proposal} lang={language}>
                <p className={styles.notice}>{t('preview')}</p>
                <div className={styles.languages} role="group" aria-label={t('language')}>
                    <M3Button
                        variant="outlined"
                        aria-pressed={language === 'de'}
                        onClick={() => {
                            i18n.changeLanguage('de');
                        }}
                    >
                        Deutsch
                    </M3Button>
                    <M3Button
                        variant="outlined"
                        aria-pressed={language === 'en'}
                        onClick={() => {
                            i18n.changeLanguage('en');
                        }}
                    >
                        English
                    </M3Button>
                </div>
                <h1>{t('title')}</h1>
                <Form form={nameForm} layout="vertical">
                    <MuiFormField name="displayName" label={t('name')} />
                </Form>
                <section aria-label={t('summary')} className={styles.summary}>
                    {selectedTopics.map((topic) => (
                        <FilterChip
                            key={topic.id}
                            label={topic[language]}
                            selected
                            disabled={lockedIds.includes(topic.id) || selected.length === 1}
                            className={styles.summaryChip}
                            ariaLabel={t('remove', { name: topic[language] })}
                            onChange={() => setSelected(selected.filter((id) => id !== topic.id))}
                        />
                    ))}
                </section>
                {lockedIds.length > 0 && <p className={styles.hint}>{t('lockedHint')}</p>}
                <div ref={trigger}>
                    <M3Button
                        variant="filled"
                        onClick={() => {
                            setDraft([...selected]);
                            searchForm.setFieldValue('search', '');
                            setOpen(true);
                        }}
                    >
                        {t('choose')}
                    </M3Button>
                </div>
                <p className={styles.hint}>{t('fixtureIcons')}</p>
                {open && (
                    <Modal
                        title={t('choose')}
                        description={t('description')}
                        width={720}
                        onClose={close}
                        onDismiss={close}
                        className={styles.dialog}
                        footer={
                            <div className={styles.actions}>
                                <M3Button variant="text" onClick={close}>
                                    {t('cancel')}
                                </M3Button>
                                <M3Button
                                    variant="filled"
                                    disabled={draft.length === 0 || status !== 'ready'}
                                    onClick={() => {
                                        setSelected([...draft]);
                                        close();
                                    }}
                                >
                                    {t('apply')}
                                </M3Button>
                            </div>
                        }
                    >
                        <div className={styles.languages} role="group" aria-label={t('language')}>
                            <M3Button
                                variant="outlined"
                                aria-pressed={language === 'de'}
                                onClick={() => {
                                    i18n.changeLanguage('de');
                                }}
                            >
                                Deutsch
                            </M3Button>
                            <M3Button
                                variant="outlined"
                                aria-pressed={language === 'en'}
                                onClick={() => {
                                    i18n.changeLanguage('en');
                                }}
                            >
                                English
                            </M3Button>
                        </div>
                        <Form form={searchForm} layout="vertical">
                            <MuiFormField name="search" label={t('search')} inputProps={{ autoFocus: true }} />
                        </Form>
                        <p className={styles.hint}>{t(policyHint)}</p>
                        {lockedIds.length > 0 && <p className={styles.hint}>{t('lockedHint')}</p>}
                        <p role="status">{t('selected', { count: draft.length })}</p>
                        <p className={styles.hint}>
                            {topics
                                .filter((topic) => draft.includes(topic.id))
                                .map((topic) => topic[language])
                                .join(' · ')}
                        </p>
                        <div className={styles.results}>
                            {status === 'loading' && <p role="status">{t('loading')}</p>}
                            {status === 'error' && (
                                <div>
                                    <p role="alert">{t('error')}</p>
                                    <M3Button variant="outlined" onClick={() => setStatus('ready')}>
                                        {t('retry')}
                                    </M3Button>
                                </div>
                            )}
                            {status === 'empty' && <p role="status">{t('empty')}</p>}
                            {status === 'ready' &&
                                matches.map((topic) => (
                                    <div key={topic.id} className={styles.choice}>
                                        <M3Checkbox
                                            checked={draft.includes(topic.id)}
                                            disabled={
                                                fixed ||
                                                lockedIds.includes(topic.id) ||
                                                (permission === 'NONE' && lockedIds.length > 0)
                                            }
                                            label={topic[language]}
                                            onChange={() => toggle(topic.id)}
                                        />
                                        {'icon' in topic ? (
                                            <img src={topic.icon} alt="" className={styles.icon} />
                                        ) : (
                                            <span className={styles.noIcon} role="img" aria-label={t('noIcon')}>
                                                —
                                            </span>
                                        )}
                                        <span className={styles.topicLabel}>
                                            {topic[language]}
                                            {lockedIds.includes(topic.id) && (
                                                <small className={styles.locked}>{t('locked')}</small>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            {status === 'ready' && matches.length === 0 && (
                                <div className={styles.empty}>
                                    <p>{t('noResults')}</p>
                                    <M3Button variant="outlined" onClick={() => searchForm.setFieldValue('search', '')}>
                                        {t('clear')}
                                    </M3Button>
                                </div>
                            )}
                        </div>
                        {draft.length === 0 && <p role="status">{t('minimum')}</p>}
                    </Modal>
                )}
            </main>
        </ConfigProvider>
    );
};

/** Story-only, isolated locale and mock selections. Never imported by a production route. */
export const TopicSelectionProposal = (props: TopicSelectionProposalProps) => {
    const locale = useMemo(() => {
        const instance = createInstance();
        instance.use(initReactI18next).init({
            lng: props.initialLanguage ?? 'de',
            fallbackLng: 'de',
            initImmediate: false,
            resources,
            interpolation: { escapeValue: false },
        });
        return instance;
    }, [props.initialLanguage]);
    return (
        <I18nextProvider i18n={locale}>
            <ThemeProvider theme={orisoMuiTheme}>
                <TopicSelection {...props} />
            </ThemeProvider>
        </I18nextProvider>
    );
};
