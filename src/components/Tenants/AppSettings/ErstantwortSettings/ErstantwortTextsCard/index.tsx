import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
 * <h3>One section at a time</h3>
 *
 * Each Baustein is an accordion section and only the open one mounts its editor.
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
}

export const ErstantwortTextsCard = ({
    contentByBaustein,
    responseDeadlineDays,
    languageFormal,
    onChange,
    onDeadlineChange,
    disabled = false,
}: ErstantwortTextsCardProps) => {
    const { t } = useTranslation();
    const variant = germanVariantFor(languageFormal);
    /* The first Baustein is open by default so the card never presents itself as
       an empty list of headings. */
    const [openKey, setOpenKey] = useState<ErstantwortBausteinKey>(ERSTANTWORT_BAUSTEINE[0].key);

    const handleDeadline = (raw: string) => {
        const trimmed = raw.trim();
        /* Empty means "fall back to the platform default", which is a different
		   state from choosing a number — and very different from 0, which would
		   promise a reply within no working days at all. */
        if (!trimmed) {
            onDeadlineChange(undefined);
            return;
        }
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || parsed < 1) return;
        onDeadlineChange(Math.floor(parsed));
    };

    return (
        <section className={styles.card} aria-labelledby="erstantwortTextsTitle">
            <h2 className={styles.title} id="erstantwortTextsTitle">
                {t('tenants.erstantwort.title')}
            </h2>
            <p className={styles.intro}>{t('tenants.erstantwort.description')}</p>

            <div className={styles.deadline}>
                <label className={styles.deadlineLabel} htmlFor="erstantwortDeadline">
                    {t('tenants.erstantwort.deadline.label')}
                </label>
                <input
                    id="erstantwortDeadline"
                    className={styles.deadlineInput}
                    type="number"
                    min={1}
                    max={30}
                    step={1}
                    disabled={disabled}
                    /* Placeholder, not a value: a pre-filled 2 would make a Träger
					   that never chose indistinguishable from one that chose 2. */
                    placeholder={String(DEFAULT_RESPONSE_DEADLINE_DAYS)}
                    value={responseDeadlineDays ?? ''}
                    onChange={(event) => handleDeadline(event.target.value)}
                />
                <p className={styles.deadlineHelp}>{t('tenants.erstantwort.deadline.help')}</p>
            </div>

            {ERSTANTWORT_BAUSTEINE.map((baustein) => (
                <Accordion
                    key={baustein.key}
                    expanded={openKey === baustein.key}
                    onChange={() => setOpenKey(baustein.key)}
                    disableGutters
                    className={styles.baustein}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <span className={styles.bausteinTitle}>{t(baustein.labelKey)}</span>
                        {baustein.mandatory && (
                            <span className={styles.mandatoryChip}>{t('tenants.erstantwort.mandatoryChip')}</span>
                        )}
                    </AccordionSummary>
                    <AccordionDetails className={styles.bausteinDetails}>
                        {/* Mounted only while open, and explicitly rather than via
                           MUI's transition config: MUI keeps a panel in the DOM
                           once it has been opened, so after visiting all five the
                           card was back to five live Tiptap decks — the exact
                           thing this accordion exists to prevent. Guarding the
                           mount here makes the invariant ours, not a library
                           setting somebody can drop. */}
                        {openKey === baustein.key && (
                            <M3RichTextEditor
                                title={t(baustein.labelKey)}
                                value={contentByBaustein[baustein.key]?.[variant] ?? ''}
                                contentLanguage={variant}
                                readOnly={disabled}
                                fluid
                                hideHeader
                                onChange={(html: string) => onChange(baustein.key, variant, html)}
                            />
                        )}
                        <p className={styles.bausteinHelp}>{t(baustein.helpKey)}</p>
                        {baustein.mandatory && (
                            <p className={styles.mandatory}>
                                {t(`${baustein.helpKey.replace('.help', '')}.mandatory`)}
                            </p>
                        )}
                    </AccordionDetails>
                </Accordion>
            ))}
        </section>
    );
};
