import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Card } from '../../../../Card';
import { M3NumberField } from '../../../../M3NumberField';
import { M3RichTextEditor } from '../../../../FormPluginEditor/M3RichTextEditor';
import {
    DEFAULT_RESPONSE_DEADLINE_DAYS,
    ERSTANTWORT_BAUSTEINE,
    ErstantwortBausteinKey,
    germanVariantFor,
} from '../erstantwortBausteine';
import styles from './styles.module.scss';

/**
 * The Träger editor for the Erstantwort Bausteine (ORISO-Admin#601, ADR-018).
 *
 * <h3>What a Träger may write, and what it may not</h3>
 *
 * Five editors, one per Baustein the Träger owns in its own voice. Everything else
 * in the Erstantwort is platform text or **derived** — rendered from configuration
 * — and a derived Baustein deliberately has no field here. A typed claim about the
 * system can contradict the configuration; a rendered one cannot. That is why the
 * response-deadline *number* is editable and its *sentence* is not.
 *
 * <h3>One German variant, never two</h3>
 *
 * The tenant is either formal or informal (`languageFormal`), so exactly one German
 * variant is requested. Only platform texts carry both axes. Asking a Träger to
 * write "Sie" and "Du" versions of its own greeting is work nobody would do, and a
 * half-filled pair renders worse than a single one.
 *
 * <h3>One card, one section at a time</h3>
 *
 * The whole page is ONE M3 `Card` (intro, deadline, five sections, publish in the card footer),
 * like the legal settings cards. Each Baustein is a collapsible section inside it, separated by
 * dividers rather than by boxes of its own, and only the open one mounts its editor.
 * Measured before that changed: five always-mounted rich-text decks made the card
 * 3,436 px tall, so a Träger admin had to scroll past four editors to reach the
 * fifth. Collapsing them also makes "which Baustein am I editing" obvious, which a
 * wall of five identical toolbars did not.
 *
 * <h3>No toggles here</h3>
 *
 * The two safety-bearing Bausteine — "send us no personal data" and the emergency
 * numbers — carry no toggle at all (ADR-018 §6). That is the deliberate interim
 * substitute for the postponed two-level permission model, and it is why this card
 * renders no switches: there is nothing here a Träger may switch off.
 */

export type ErstantwortContentMap = Partial<Record<ErstantwortBausteinKey, Record<string, string> | undefined>>;

export interface ErstantwortTextsCardProps {
    contentByBaustein: ErstantwortContentMap;
    /** Absent means the platform default applies — not the same as choosing it. */
    responseDeadlineDays?: number;
    /** The tenant's own formal/informal axis; picks the single German variant. */
    languageFormal?: boolean;
    onChange: (key: ErstantwortBausteinKey, language: string, html: string) => void;
    onDeadlineChange: (days: number | undefined) => void;
    disabled?: boolean;
    /** Bottom action row of the card (the publish button). */
    footer?: ReactNode;
    /**
     * What the advice seeker reads when a field is left empty, as plain text per Baustein, and the
     * fixed emergency-number sentence. Read-only. The Admin app has no source for these yet (they
     * live in UserService `erstantwort/<locale>.json`), so the container passes nothing today and
     * the previews stay hidden rather than showing an invented text.
     */
    platformDefaults?: {
        texts?: Partial<Record<ErstantwortBausteinKey, string>>;
        emergencyNumbers?: string;
    };
}

const PlatformPreview = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className={styles.platformPreview} data-testid="erstantwort-platform-preview">
        <span className={styles.platformPreviewLabel}>{label}</span>
        <p className={styles.platformPreviewText}>{children}</p>
    </div>
);

export const ErstantwortTextsCard = ({
    contentByBaustein,
    responseDeadlineDays,
    languageFormal,
    onChange,
    onDeadlineChange,
    disabled = false,
    footer,
    platformDefaults,
}: ErstantwortTextsCardProps) => {
    const { t } = useTranslation();
    const variant = germanVariantFor(languageFormal);
    /* The first Baustein is open by default so the card never presents itself as
       an empty list of headings. */
    const [openKey, setOpenKey] = useState<ErstantwortBausteinKey>(ERSTANTWORT_BAUSTEINE[0].key);

    const handleDeadline = (days: number | undefined) => {
        /* Empty means "fall back to the platform default", which is a different
           state from choosing a number — and very different from 0, which would
           promise a reply within no working days at all. */
        if (days === undefined) {
            onDeadlineChange(undefined);
            return;
        }
        if (!Number.isFinite(days) || days < 1) return;
        onDeadlineChange(Math.floor(days));
    };

    return (
        <Card
            titleKey="tenants.erstantwort.title"
            autoHeight
            className={styles.card}
            footer={footer}
            dataTestId="erstantwort-card"
        >
            <div className={styles.body}>
                <section className={styles.section}>
                    {/* Placeholder, not a value: a pre-filled 2 would make a Träger
                        that never chose indistinguishable from one that chose 2. */}
                    <M3NumberField
                        className={styles.deadlineField}
                        label={t('tenants.erstantwort.deadline.label')}
                        value={responseDeadlineDays}
                        min={1}
                        max={30}
                        step={1}
                        variant="outlined"
                        disabled={disabled}
                        inputProps={{ placeholder: String(DEFAULT_RESPONSE_DEADLINE_DAYS) }}
                        onChange={handleDeadline}
                    />
                    <p className={styles.help}>{t('tenants.erstantwort.deadline.help')}</p>
                </section>

                {ERSTANTWORT_BAUSTEINE.map((baustein) => {
                    const open = openKey === baustein.key;
                    const panelId = `erstantwort-panel-${baustein.key}`;
                    const platformText = platformDefaults?.texts?.[baustein.key];
                    const emergency =
                        baustein.key === 'erstantwortEmergencyAddition'
                            ? platformDefaults?.emergencyNumbers
                            : undefined;
                    return (
                        <section key={baustein.key} className={styles.section}>
                            <button
                                type="button"
                                className={styles.sectionToggle}
                                aria-expanded={open}
                                aria-controls={panelId}
                                onClick={() => setOpenKey(baustein.key)}
                            >
                                <span className={styles.sectionToggleTitle}>{t(baustein.labelKey)}</span>
                                {baustein.mandatory && (
                                    <span className={styles.mandatoryChip}>
                                        {t('tenants.erstantwort.mandatoryChip')}
                                    </span>
                                )}
                                <ExpandMoreIcon
                                    className={classNames(styles.chevron, { [styles.chevronOpen]: open })}
                                />
                            </button>
                            {open && (
                                <div className={styles.panel} id={panelId}>
                                    {/* Mounted only while open, and explicitly rather than via a
                                       library transition: a panel that stays in the DOM after
                                       its first opening would bring back five live Tiptap decks —
                                       the exact thing this one-at-a-time layout prevents. */}
                                    <M3RichTextEditor
                                        title={t(baustein.labelKey)}
                                        value={contentByBaustein[baustein.key]?.[variant] ?? ''}
                                        contentLanguage={variant}
                                        readOnly={disabled}
                                        fluid
                                        hideHeader
                                        plainText
                                        enableAnchors={false}
                                        onChange={(html: string) => onChange(baustein.key, variant, html)}
                                    />
                                    <p className={styles.help}>{t(baustein.helpKey)}</p>
                                    {baustein.mandatory && (
                                        <p className={styles.mandatory}>
                                            {t(`${baustein.helpKey.replace('.help', '')}.mandatory`)}
                                        </p>
                                    )}
                                    {platformText && (
                                        <PlatformPreview label={t('tenants.erstantwort.platformText.label')}>
                                            {platformText}
                                        </PlatformPreview>
                                    )}
                                    {emergency && (
                                        <PlatformPreview label={t('tenants.erstantwort.emergencyNumbers.label')}>
                                            {emergency}
                                        </PlatformPreview>
                                    )}
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
        </Card>
    );
};
