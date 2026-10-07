import { useId, useRef, useState } from 'react';
import { ConfigProvider, Form } from 'antd';
import deDE from 'antd/es/locale/de_DE';
import enGB from 'antd/es/locale/en_GB';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import AddRounded from '@mui/icons-material/AddRounded';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import { AgencyGeneralInformation } from '../../Agency/Edit/components/GeneralInformation';
import { Card } from '../../../components/Card';
import { M3Checkbox } from '../../../components/M3Checkbox';
import { M3Button } from '../../../components/M3Button';
import { Modal } from '../../../components/Modal';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { ReactComponent as CounselingIcon } from '../../../resources/img/svg/navbar/counseling_active.svg';
import translationDe from '../../../locales/de/translation.json';
import translationEn from '../../../locales/en/translation.json';
import { copy, copyFields, emptyFields, firstCentre, proposalTopics } from './fixtures';
import type { CentreFields, CopyBlock, ProposalLocale, SavedCentre } from './fixtures';
import styles from './styles.module.scss';

type Step = 'form' | 'saved' | 'copy' | 'finished';
export interface CentreSetupProposalProps {
    locale?: ProposalLocale;
    allowAdditional?: boolean;
    initialStep?: Step;
    singleTopic?: boolean;
    failNextSave?: boolean;
}

const CentreSetupExample = ({
    locale,
    onLanguage,
    allowAdditional = true,
    initialStep = 'form',
    singleTopic = false,
    failNextSave = false,
}: CentreSetupProposalProps & { locale: ProposalLocale; onLanguage: (next: ProposalLocale) => void }) => {
    const text = copy[locale];
    const controlId = useId();
    const [form] = Form.useForm<CentreFields>();
    const [allowed, setAllowed] = useState(allowAdditional);
    const [step, setStep] = useState<Step>(initialStep);
    const [saved, setSaved] = useState<SavedCentre[]>(initialStep === 'form' ? [] : [{ ...firstCentre }]);
    const [draft, setDraft] = useState<CentreFields>({ ...firstCentre });
    const [topicIds, setTopicIds] = useState([...firstCentre.topicIds]);
    const [blocks, setBlocks] = useState<CopyBlock[]>([]);
    const [copied, setCopied] = useState(false);
    const [failed, setFailed] = useState(false);
    const [failAvailable, setFailAvailable] = useState(failNextSave);
    const committed = useRef(false);
    const creationDenied = saved.length > 0 && !allowed && step === 'form';
    const currentNumber = step === 'form' ? saved.length + 1 : saved.length;

    const applyCopy = () => {
        if (!allowed) return;
        const source = saved[saved.length - 1];
        const next = { ...emptyFields };
        blocks.forEach((block) => {
            if (block !== 'topics')
                copyFields[block].forEach((field) => {
                    next[field] = source[field];
                });
        });
        form.resetFields();
        form.setFieldsValue(next);
        setDraft(next);
        setTopicIds(blocks.includes('topics') ? [...source.topicIds] : []);
        setCopied(true);
        setFailed(false);
        committed.current = false;
        setStep('form');
    };

    const formFooter = (
        <M3Button variant="filled" onClick={() => form.submit()} disabled={topicIds.length === 0 || creationDenied}>
            {text.save}
        </M3Button>
    );
    const savedFooter = step === 'saved' && (
        <>
            <M3Button variant="outlined" onClick={() => setStep('finished')}>
                {text.finish}
            </M3Button>
            {allowed && (
                <M3Button
                    variant="filled"
                    icon={<AddRounded />}
                    onClick={() => {
                        setBlocks([]);
                        setStep('copy');
                    }}
                >
                    {text.another}
                </M3Button>
            )}
        </>
    );
    const footer = <div className={styles.actions}>{step === 'form' ? formFooter : savedFooter}</div>;
    let activeStep = 1;
    let cardTitle = text.saved;
    let cardDescription = text.savedHint;
    if (step === 'form') {
        activeStep = 0;
        cardTitle = text.formTitle;
        cardDescription = text.formHint;
    }
    if (step === 'finished') {
        activeStep = 2;
        cardTitle = text.done;
        cardDescription = text.doneHint;
    }

    return (
        <main className={styles.page} lang={locale}>
            <div className={styles.shell}>
                <div className={styles.previewBar}>
                    <span className={styles.previewBadge}>{text.preview}</span>
                    <div className={styles.languages} aria-label={locale === 'de' ? 'Sprache' : 'Language'}>
                        <M3Button aria-pressed={locale === 'de'} variant="text" onClick={() => onLanguage('de')}>
                            Deutsch
                        </M3Button>
                        <M3Button aria-pressed={locale === 'en'} variant="text" onClick={() => onLanguage('en')}>
                            English
                        </M3Button>
                    </div>
                </div>
                <p className={styles.notice}>{text.notice}</p>
                <header className={styles.header}>
                    <div className={styles.heroIcon} aria-hidden="true">
                        <CounselingIcon aria-hidden="true" focusable="false" width={24} height={24} />
                    </div>
                    <div>
                        <h1>{text.title}</h1>
                        <p>{text.intro}</p>
                    </div>
                </header>
                <details className={styles.invitation} open>
                    <summary>{text.inviter}</summary>
                    <p>{text.carrier}</p>
                    <div className={styles.choice}>
                        <M3Checkbox
                            label={text.grant}
                            describedById={`${controlId}-grant-hint`}
                            checked={allowed}
                            onChange={setAllowed}
                        />
                        <span>
                            {text.grant}
                            <small id={`${controlId}-grant-hint`}>{text.grantHint}</small>
                        </span>
                    </div>
                </details>
                <div className={styles.secure}>
                    <VerifiedUserOutlined aria-hidden="true" />
                    {text.secure}
                </div>
                <ol className={styles.steps}>
                    {[text.stepForm, text.stepSaved, text.stepFinish].map((label, index) => (
                        <li key={label} aria-current={index === activeStep ? 'step' : undefined}>
                            <span>{index + 1}</span>
                            {label}
                        </li>
                    ))}
                </ol>
                <div className={styles.centreHeading}>
                    <span>
                        {text.centre} {currentNumber}
                    </span>
                    <span>
                        {saved.length} {text.count}
                    </span>
                </div>
                <Card
                    titleKey={cardTitle}
                    subTitle={cardDescription}
                    headerIcon={
                        step === 'form' ? (
                            <CounselingIcon aria-hidden="true" focusable="false" />
                        ) : (
                            <CheckCircleOutlined />
                        )
                    }
                    variant="dialog"
                    autoHeight
                    dialogContentPadding
                    footer={footer}
                >
                    {step === 'form' ? (
                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={draft}
                            onFinish={(values) => {
                                if (committed.current || creationDenied) return;
                                if (failAvailable) {
                                    setFailAvailable(false);
                                    setFailed(true);
                                    return;
                                }
                                committed.current = true;
                                setFailed(false);
                                setSaved((current) => [...current, { ...values, topicIds: [...topicIds] }]);
                                setStep('saved');
                            }}
                        >
                            {creationDenied && (
                                <div role="alert" className={styles.error}>
                                    <p>{text.denied}</p>
                                    <M3Button variant="outlined" onClick={() => setStep('saved')}>
                                        {text.return}
                                    </M3Button>
                                </div>
                            )}
                            {failed && (
                                <p role="alert" className={styles.error}>
                                    {text.error}
                                </p>
                            )}
                            <p className={styles.helper}>{copied ? text.copied : text.firstHint}</p>
                            <AgencyGeneralInformation asFields />
                            <fieldset className={styles.topics}>
                                <legend>{text.topics}</legend>
                                <p>{singleTopic ? text.singleHint : text.topicsHint}</p>
                                {proposalTopics.map((topic) => {
                                    const selectTopic = () =>
                                        setTopicIds((current) => {
                                            if (singleTopic) return [topic.id];
                                            if (current.includes(topic.id))
                                                return current.filter((id) => id !== topic.id);
                                            return [...current, topic.id];
                                        });
                                    return singleTopic ? (
                                        <label
                                            key={topic.id}
                                            className={styles.choice}
                                            htmlFor={`${controlId}-topic-${topic.id}`}
                                        >
                                            <input
                                                id={`${controlId}-topic-${topic.id}`}
                                                type="radio"
                                                name="centre-topic"
                                                checked={topicIds.includes(topic.id)}
                                                onChange={selectTopic}
                                            />
                                            <span>{topic[locale]}</span>
                                        </label>
                                    ) : (
                                        <div key={topic.id} className={styles.choice}>
                                            <M3Checkbox
                                                label={topic[locale]}
                                                checked={topicIds.includes(topic.id)}
                                                onChange={selectTopic}
                                            />
                                            <span>{topic[locale]}</span>
                                        </div>
                                    );
                                })}
                                {topicIds.length === 0 && <p className={styles.helper}>{text.topicRequired}</p>}
                            </fieldset>
                        </Form>
                    ) : (
                        <section aria-label={text.savedList} className={styles.savedList}>
                            {saved.map((centre, index) => (
                                <article key={index} className={styles.savedCentre}>
                                    <CheckCircleOutlined aria-hidden="true" />
                                    <div>
                                        <h2>{centre.name}</h2>
                                        <p>{centre.city}</p>
                                        <p>
                                            {centre.street} {centre.houseNumber} · {centre.postcode}
                                        </p>
                                        <p>
                                            {proposalTopics
                                                .filter((topic) => centre.topicIds.includes(topic.id))
                                                .map((topic) => topic[locale])
                                                .join(' · ')}
                                        </p>
                                    </div>
                                </article>
                            ))}
                            {!allowed && step !== 'finished' && <p className={styles.helper}>{text.noGrant}</p>}
                        </section>
                    )}
                </Card>
                {step === 'copy' && (
                    <Modal
                        title={text.copyTitle}
                        description={text.copyHint}
                        width="min(680px, calc(100vw - 32px))"
                        className={styles.copyDialog}
                        onClose={() => setStep('saved')}
                        footer={
                            <div className={styles.actions}>
                                <M3Button variant="text" onClick={() => setStep('saved')}>
                                    {text.cancel}
                                </M3Button>
                                <M3Button variant="filled" onClick={applyCopy} disabled={!allowed}>
                                    {text.copyApply}
                                </M3Button>
                            </div>
                        }
                    >
                        <p className={styles.helper}>{text.review}</p>
                        {(['address', 'contact', 'hours', 'topics'] as const).map((block) => (
                            <div key={block} className={styles.copyChoice}>
                                <M3Checkbox
                                    label={text[block === 'topics' ? 'topicsCopy' : block]}
                                    describedById={`${controlId}-copy-${block}-hint`}
                                    checked={blocks.includes(block)}
                                    onChange={() =>
                                        setBlocks((current) =>
                                            current.includes(block)
                                                ? current.filter((value) => value !== block)
                                                : [...current, block],
                                        )
                                    }
                                />
                                <span>
                                    {text[block === 'topics' ? 'topicsCopy' : block]}
                                    <small id={`${controlId}-copy-${block}-hint`}>
                                        {text[`${block === 'topics' ? 'topics' : block}Detail`]}
                                    </small>
                                </span>
                            </div>
                        ))}
                        <p className={styles.notice}>{text.source}</p>
                    </Modal>
                )}
            </div>
        </main>
    );
};

/** Storybook-only simulation; intentionally imports no service clients or product routes. */
export const CentreSetupProposal = ({ locale = 'de', ...props }: CentreSetupProposalProps) => {
    const [instance] = useState(() => {
        const value = createInstance();
        value.use(initReactI18next).init({
            lng: locale,
            fallbackLng: 'de',
            initImmediate: false,
            keySeparator: false,
            interpolation: { escapeValue: false },
            resources: { de: { translation: translationDe }, en: { translation: translationEn } },
        });
        return value;
    });
    const [language, setLanguage] = useState(locale);
    return (
        <I18nextProvider i18n={instance}>
            <ThemeProvider theme={orisoMuiTheme}>
                <ConfigProvider
                    locale={language === 'en' ? enGB : deDE}
                    modal={{ closable: { 'aria-label': (language === 'en' ? enGB : deDE).global?.close } }}
                >
                    <CentreSetupExample
                        {...props}
                        locale={language}
                        onLanguage={(next) => {
                            instance.changeLanguage(next);
                            setLanguage(next);
                        }}
                    />
                </ConfigProvider>
            </ThemeProvider>
        </I18nextProvider>
    );
};
