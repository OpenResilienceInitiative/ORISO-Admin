import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import MailOutline from '@mui/icons-material/EmailOutlined';
import ChatOutlined from '@mui/icons-material/ChatOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { Card } from '../Card';
import { M3Button } from '../M3Button';
import {
    CONVERSATION_TYPES,
    fieldSummary,
    prototypeFor,
    type ConversationModule,
    type ConversationType,
    type ModuleField,
    type ModuleLevel,
} from './conversationModule';
import { ConversationModuleConfigurator } from './ConversationModuleConfigurator';
import type { RegistrationSettings, RegistrationTopic } from './registrationQuestionnaire';
import styles from './styles.module.scss';

const TYPE_ICONS: Record<ConversationType, ReactElement> = {
    AGENCY_COUNSELLING: <MailOutline />,
    LIVE_CHAT: <ChatOutlined />,
    SELF_HELP: <GroupsOutlined />,
    INTERNAL_GROUP: <LockOutlined />,
};

export interface ConversationModulesSettingsProps {
    /** The level being edited; a type without an own module shows what it inherits. */
    level: Exclude<ModuleLevel, 'prototype' | 'conversation'>;
    /** Own modules stored at this level. */
    modules?: Partial<Record<ConversationType, ConversationModule>>;
    /** What a type inherits when this level has no module (defaults to the prototype). */
    inherited?: Partial<Record<ConversationType, { module: ConversationModule; level: ModuleLevel }>>;
    registration?: { settings: RegistrationSettings; topics: RegistrationTopic[] };
    /** Opens one dialog right away (stories). */
    initiallyOpen?: { type: ConversationType; tab?: ModuleField | 'registration' };
    onSave?: (type: ConversationType, module: ConversationModule, registration?: RegistrationSettings) => void;
}

/**
 * Conversation modules (ADR-036): a tile per conversation type with the two fields
 * "Begrüßung" and "Abschließende Fragen" and a button that opens the configurator.
 * Prototype — local state only until the UserService storage exists.
 */
export const ConversationModulesSettings = ({
    level,
    modules: initialModules = {},
    inherited = {},
    registration,
    initiallyOpen,
    onSave,
}: ConversationModulesSettingsProps) => {
    const { t } = useTranslation();
    const [modules, setModules] = useState(initialModules);
    const [registrationSettings, setRegistrationSettings] = useState(registration?.settings);
    const [editing, setEditing] = useState(initiallyOpen);

    const effective = (type: ConversationType) => {
        const own = modules[type];
        if (own) return { module: own, level: level as ModuleLevel };
        return inherited[type] ?? { module: prototypeFor(type), level: 'prototype' as ModuleLevel };
    };

    const fieldValue = (module: ConversationModule, field: ModuleField) => {
        const summary = fieldSummary(module, field);
        if (summary.sections === 0) return t('conversationModules.tile.none');
        const parts = [t('conversationModules.tile.sections', { count: summary.sections })];
        if (summary.questions > 0) parts.push(t('conversationModules.tile.questions', { count: summary.questions }));
        if (field === 'closingQuestions' && summary.questions > 0) {
            parts.push(
                t(
                    module.survey?.anonymous === false
                        ? 'conversationModules.tile.linked'
                        : 'conversationModules.tile.anonymous',
                ),
            );
        }
        return parts.join(' · ');
    };

    const editingEntry = editing ? effective(editing.type) : undefined;

    return (
        <div className={styles.page}>
            <p className={styles.intro}>{t('conversationModules.intro')}</p>
            <div className={styles.grid}>
                {CONVERSATION_TYPES.map((type) => {
                    const { module, level: from } = effective(type);
                    return (
                        <Card
                            key={type}
                            variant="dialog"
                            headerIcon={TYPE_ICONS[type]}
                            titleKey={`conversationModules.type.${type}`}
                            dataTestId={`conversation-module-tile-${type}`}
                            footer={
                                <M3Button variant="tonal" onClick={() => setEditing({ type })}>
                                    {t('conversationModules.tile.configure')}
                                </M3Button>
                            }
                        >
                            <div className={styles.tileBody}>
                                <span className={styles.chip}>{t(`conversationModules.level.${from}`)}</span>
                                {(['greeting', 'closingQuestions'] as const).map((field) => (
                                    <div key={field} className={styles.tileField}>
                                        <span className={styles.tileFieldLabel}>
                                            {t(`conversationModules.field.${field}`)}
                                        </span>
                                        <span className={styles.tileFieldValue}>{fieldValue(module, field)}</span>
                                    </div>
                                ))}
                                {module.sections.length === 0 && (
                                    <p className={styles.help}>{t('conversationModules.tile.emptyHint')}</p>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
            {editing && editingEntry && (
                <ConversationModuleConfigurator
                    key={editing.type}
                    open
                    module={editingEntry.module}
                    prototype={prototypeFor(editing.type)}
                    initialTab={editing.tab}
                    registration={
                        editing.type === 'AGENCY_COUNSELLING' &&
                        level === 'platform' &&
                        registration &&
                        registrationSettings
                            ? { settings: registrationSettings, topics: registration.topics }
                            : undefined
                    }
                    onClose={() => setEditing(undefined)}
                    onSave={(module, nextRegistration) => {
                        setModules((current) => ({ ...current, [editing.type]: module }));
                        if (nextRegistration) setRegistrationSettings(nextRegistration);
                        onSave?.(editing.type, module, nextRegistration);
                        setEditing(undefined);
                    }}
                />
            )}
        </div>
    );
};
