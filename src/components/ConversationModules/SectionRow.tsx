import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { M3Select } from '../M3Select';
import { ToggleRow } from '../ToggleRow';
import { IconButton } from '../IconButton';
import { M3RichTextEditor } from '../FormPluginEditor/M3RichTextEditor';
import {
    FIXED_MODULES,
    QUESTION_TRIGGERS,
    languagesWithoutText,
    type FixedModuleId,
    type ModuleSection,
    type QuestionTrigger,
} from './conversationModule';
import { QuestionEditor } from './QuestionEditor';
import styles from './styles.module.scss';

interface SectionRowProps {
    section: ModuleSection;
    language: string;
    expanded: boolean;
    isFirst: boolean;
    isLast: boolean;
    onToggle: () => void;
    onChange: (section: ModuleSection) => void;
    onMove: (direction: -1 | 1) => void;
    onRemove: () => void;
}

/** One row of the section list: summary line with order and remove controls, editor when expanded. */
export const SectionRow = ({
    section,
    language,
    expanded,
    isFirst,
    isLast,
    onToggle,
    onChange,
    onMove,
    onRemove,
}: SectionRowProps) => {
    const { t } = useTranslation();
    const title =
        section.kind === 'fixed' && section.fixed && !section.title[language]
            ? t(`conversationModules.fixed.${section.fixed}`)
            : section.title[language] || section.title.de || t('conversationModules.section.untitled');
    const editorId = `module-section-editor-${section.id}`;
    const missing = languagesWithoutText(section);

    return (
        <li className={styles.row} data-testid={`module-section-${section.prototypeId ?? section.id}`}>
            <div className={styles.rowHeader}>
                <button
                    type="button"
                    className={styles.rowToggle}
                    aria-expanded={expanded}
                    aria-controls={editorId}
                    onClick={onToggle}
                >
                    <span className={styles.rowTitle}>{title}</span>
                    <span className={styles.rowMeta}>
                        <span className={styles.chip}>{t(`conversationModules.kind.${section.kind}`)}</span>
                        {section.safety && (
                            <span className={classNames(styles.chip, styles.chipSafety)}>
                                {t('conversationModules.safety.badge')}
                            </span>
                        )}
                    </span>
                    <ExpandMoreIcon style={{ transform: expanded ? 'rotate(180deg)' : undefined }} />
                </button>
                <span className={styles.rowActions}>
                    <IconButton
                        icon={<ArrowUpward />}
                        ariaLabel={t('conversationModules.section.moveUp')}
                        disabled={isFirst}
                        onClick={() => onMove(-1)}
                    />
                    <IconButton
                        icon={<ArrowDownward />}
                        ariaLabel={t('conversationModules.section.moveDown')}
                        disabled={isLast}
                        onClick={() => onMove(1)}
                    />
                    <IconButton
                        icon={<DeleteOutline />}
                        ariaLabel={t('conversationModules.section.remove')}
                        onClick={onRemove}
                    />
                </span>
            </div>
            {expanded && (
                <div className={styles.rowEditor} id={editorId}>
                    <FloatingLabelInput
                        label={t('conversationModules.section.title')}
                        value={section.title[language] ?? ''}
                        onChange={(event) =>
                            onChange({ ...section, title: { ...section.title, [language]: event.target.value } })
                        }
                    />
                    {(section.kind === 'panel' || section.kind === 'questions') && (
                        <ToggleRow
                            label={t('conversationModules.section.startsCollapsed')}
                            checked={section.display === 'collapsed'}
                            onCheckedChange={(collapsed) =>
                                onChange({ ...section, display: collapsed ? 'collapsed' : 'open' })
                            }
                        />
                    )}
                    {section.kind === 'fixed' && (
                        <>
                            <M3Select<FixedModuleId>
                                aria-label={t('conversationModules.fixed.label')}
                                value={section.fixed ?? 'email'}
                                options={FIXED_MODULES.map((id) => ({
                                    value: id,
                                    label: t(`conversationModules.fixed.${id}`),
                                }))}
                                onChange={(fixed: FixedModuleId) => onChange({ ...section, fixed })}
                                getPopupContainer={(node: HTMLElement) => node.parentElement ?? document.body}
                            />
                            <p className={styles.help}>{t('conversationModules.fixed.help')}</p>
                        </>
                    )}
                    {section.kind !== 'fixed' && (
                        <M3RichTextEditor
                            title={t('conversationModules.section.body')}
                            value={section.body[language] ?? ''}
                            contentLanguage={language}
                            languageSlot={<span />}
                            fluid
                            hideHeader
                            plainText
                            enableAnchors={false}
                            versionLabel={t('legal.m3Editor.versionLatest')}
                            onChange={(html: string) =>
                                onChange({ ...section, body: { ...section.body, [language]: html } })
                            }
                        />
                    )}
                    {section.kind === 'questions' && section.field === 'greeting' && (
                        <M3Select<QuestionTrigger>
                            aria-label={t('conversationModules.section.trigger')}
                            value={section.trigger ?? 'withGreeting'}
                            options={QUESTION_TRIGGERS.map((trigger) => ({
                                value: trigger,
                                label: t(`conversationModules.trigger.${trigger}`),
                            }))}
                            onChange={(trigger: QuestionTrigger) => onChange({ ...section, trigger })}
                            getPopupContainer={(node: HTMLElement) => node.parentElement ?? document.body}
                        />
                    )}
                    {section.kind === 'questions' && (
                        <QuestionEditor section={section} language={language} onChange={onChange} />
                    )}
                    {missing.length > 0 && missing.length < 7 && (
                        <p className={styles.help}>
                            {t('conversationModules.section.missingLanguages', {
                                languages: missing.map((code) => t(`language.${code}`, code)).join(', '),
                            })}
                        </p>
                    )}
                </div>
            )}
        </li>
    );
};
