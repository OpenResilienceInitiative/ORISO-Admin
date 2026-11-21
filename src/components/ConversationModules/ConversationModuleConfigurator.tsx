import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { ToggleRow } from '../ToggleRow';
import { AdminSegmentedTabs } from '../AdminSegmentedTabs/AdminSegmentedTabs';
import { LegalContentLanguageSelect } from '../Tenants/LegalSettings/components/LegalContentLanguageSelect';
import {
    MODULE_LANGUAGES,
    MODULE_SOURCE_LANGUAGE,
    SECTION_KINDS,
    addSection,
    moveSection,
    prepareForPublish,
    removeSection,
    removedSafetySections,
    sectionsOf,
    updateSection,
    type ConversationModule,
    type ModuleField,
    type ModuleSection,
} from './conversationModule';
import { RegistrationPerTopicTab } from './RegistrationPerTopicTab';
import type { RegistrationSettings, RegistrationTopic } from './registrationQuestionnaire';
import { SectionRow } from './SectionRow';
import styles from './styles.module.scss';

type ConfiguratorTab = ModuleField | 'registration';

export interface ConversationModuleConfiguratorProps {
    open: boolean;
    module: ConversationModule;
    prototype: ConversationModule;
    initialTab?: ConfiguratorTab;
    /** Registration per topic (ADR-036 part C): Mailberatung at platform level only. */
    registration?: { settings: RegistrationSettings; topics: RegistrationTopic[] };
    onSave: (module: ConversationModule, registration?: RegistrationSettings) => void;
    onClose: () => void;
}

let sectionCounter = 0;
const nextSectionId = () => {
    sectionCounter += 1;
    return `section-${Date.now().toString(36)}-${sectionCounter}`;
};

/**
 * The shared configurator (ADR-036 decision 4): one dialog per conversation type with the
 * greeting and the closing questions as an ordered list of sections. The same component is meant
 * for the Admin levels and for the Frontend's conversation level.
 */
export const ConversationModuleConfigurator = ({
    open,
    module: stored,
    prototype,
    initialTab = 'greeting',
    registration,
    onSave,
    onClose,
}: ConversationModuleConfiguratorProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<ConversationModule>(stored);
    const [registrationDraft, setRegistrationDraft] = useState(registration?.settings);
    const [tab, setTab] = useState<ConfiguratorTab>(initialTab);
    const [language, setLanguage] = useState<string>(MODULE_SOURCE_LANGUAGE);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);

    const typeLabel = t(`conversationModules.type.${draft.conversationType}`);
    const missingSafety = useMemo(() => removedSafetySections(draft, prototype), [draft, prototype]);

    const tabs = [
        { id: 'greeting', label: t('conversationModules.field.greeting') },
        { id: 'closingQuestions', label: t('conversationModules.field.closingQuestions') },
        ...(registration ? [{ id: 'registration', label: t('conversationModules.tab.registration') }] : []),
    ];

    const field: ModuleField | null = tab === 'registration' ? null : tab;
    const sections = field ? sectionsOf(draft, field) : [];

    const change = (section: ModuleSection) => setDraft((current) => updateSection(current, section.id, section));

    const restoreSafety = () =>
        setDraft((current) => {
            const ids = new Set(current.sections.map((section) => section.id));
            const missing = removedSafetySections(current, prototype).filter((section) => !ids.has(section.id));
            return { ...current, sections: [...current.sections, ...structuredClone(missing)] };
        });

    const add = (kind: (typeof SECTION_KINDS)[number]) => {
        if (!field) return;
        const id = nextSectionId();
        setDraft((current) => addSection(current, field, kind, id));
        setExpandedId(id);
    };

    const footer = (
        <div className={styles.footer}>
            <M3Button variant="text" onClick={() => setConfirmReset(true)}>
                {t('conversationModules.dialog.reset')}
            </M3Button>
            <div className={styles.footerEnd}>
                <M3Button variant="text" onClick={onClose}>
                    {t('conversationModules.dialog.cancel')}
                </M3Button>
                <M3Button variant="filled" onClick={() => onSave(prepareForPublish(draft, stored), registrationDraft)}>
                    {t('conversationModules.dialog.save')}
                </M3Button>
            </div>
        </div>
    );

    return (
        <>
            {open && (
                <Modal
                    icon={<TuneOutlined />}
                    title={t('conversationModules.dialog.title', { type: typeLabel })}
                    descriptionKey="conversationModules.dialog.description"
                    descriptionFullWidth
                    width={1080}
                    footer={footer}
                    onClose={onClose}
                    wrapperTestId="conversation-module-configurator"
                >
                    <div className={styles.dialogBody}>
                        <div className={styles.toolbar}>
                            <AdminSegmentedTabs
                                ariaLabel={t('conversationModules.dialog.title', { type: typeLabel })}
                                items={tabs}
                                activeId={tab}
                                onChange={(id) => {
                                    setTab(id as ConfiguratorTab);
                                    setExpandedId(null);
                                }}
                            />
                            {field && (
                                <LegalContentLanguageSelect
                                    languages={[...MODULE_LANGUAGES]}
                                    value={language}
                                    onChange={setLanguage}
                                    sourceLanguage={MODULE_SOURCE_LANGUAGE}
                                />
                            )}
                        </div>

                        {missingSafety.length > 0 && (
                            <div className={styles.warning} role="alert" data-testid="module-safety-warning">
                                <p className={styles.warningTitle}>{t('conversationModules.safety.title')}</p>
                                <p>
                                    {t('conversationModules.safety.text', {
                                        titles: missingSafety
                                            .map((section) => section.title[language] || section.title.de)
                                            .join('“, „'),
                                    })}
                                </p>
                                <div>
                                    <M3Button variant="outlined" onClick={restoreSafety}>
                                        {t('conversationModules.safety.restore')}
                                    </M3Button>
                                </div>
                            </div>
                        )}

                        {tab === 'registration' && registration && registrationDraft && (
                            <RegistrationPerTopicTab
                                settings={registrationDraft}
                                topics={registration.topics}
                                onChange={setRegistrationDraft}
                            />
                        )}

                        {field === 'closingQuestions' && (
                            <div>
                                <ToggleRow
                                    label={t('conversationModules.survey.anonymous')}
                                    description={t('conversationModules.survey.anonymousHelp')}
                                    checked={draft.survey?.anonymous ?? true}
                                    onCheckedChange={(anonymous) =>
                                        setDraft((current) => ({ ...current, survey: { anonymous } }))
                                    }
                                />
                            </div>
                        )}

                        {field && (
                            <>
                                {sections.length === 0 ? (
                                    <p className={styles.intro}>{t('conversationModules.empty.field')}</p>
                                ) : (
                                    <ol className={styles.list} aria-label={t(`conversationModules.field.${field}`)}>
                                        {sections.map((section, index) => (
                                            <SectionRow
                                                key={section.id}
                                                section={section}
                                                language={language}
                                                expanded={expandedId === section.id}
                                                isFirst={index === 0}
                                                isLast={index === sections.length - 1}
                                                onToggle={() =>
                                                    setExpandedId((current) =>
                                                        current === section.id ? null : section.id,
                                                    )
                                                }
                                                onChange={change}
                                                onMove={(direction) =>
                                                    setDraft((current) => moveSection(current, section.id, direction))
                                                }
                                                onRemove={() =>
                                                    setDraft((current) => removeSection(current, section.id))
                                                }
                                            />
                                        ))}
                                    </ol>
                                )}
                                <div className={styles.addBar}>
                                    <span className={styles.tileFieldLabel}>{t('conversationModules.add')}</span>
                                    <div className={styles.addButtons}>
                                        {SECTION_KINDS.map((kind) => (
                                            <button
                                                key={kind}
                                                type="button"
                                                className={styles.addButton}
                                                onClick={() => add(kind)}
                                                data-testid={`module-add-${kind}`}
                                            >
                                                <strong>{t(`conversationModules.kind.${kind}`)}</strong>
                                                <span>{t(`conversationModules.kindHelp.${kind}`)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            )}
            {confirmReset && (
                <Modal
                    titleKey="conversationModules.dialog.resetConfirmTitle"
                    contentKey="conversationModules.dialog.resetConfirmText"
                    okLabelKey="conversationModules.dialog.resetConfirmOk"
                    cancelLabelKey="conversationModules.dialog.cancel"
                    zIndex={1100}
                    onConfirm={() => {
                        setDraft(structuredClone(prototype));
                        setExpandedId(null);
                        setConfirmReset(false);
                    }}
                    onClose={() => setConfirmReset(false)}
                />
            )}
        </>
    );
};
