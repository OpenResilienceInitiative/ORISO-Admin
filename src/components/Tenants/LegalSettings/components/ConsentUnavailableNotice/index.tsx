import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../Modal';
import { SplitButton } from '../../../../GlobalSearch/SplitButton';
import { LegalConsentHeadIcon } from '../../../../PlaceholderTemplate';
import { consentDisclaimerFor, type ConsentUnavailableReason } from '../../utils/consentUnavailable';
import styles from './styles.module.scss';

export interface ConsentUnavailableNoticeProps {
    /** Why the consent sentence cannot be edited for the current selection. */
    reason: ConsentUnavailableReason;
    /**
     * The legal-content language currently being edited. The zero-Fachbereich
     * disclaimer is shown in it, because it stands in the place of the consent
     * sentence — which is authored per content language, not per admin UI language.
     */
    language: string;
}

/**
 * Stand-in for the consent trigger on the surfaces where the consent sentence cannot
 * be edited (#914): the Beratungsstelle has no Fachbereich at all, or the switcher is
 * on "Alle Fachbereiche", which #862 keeps consent-free.
 *
 * Before this, the slot was simply empty — the admin saw no consent control and had
 * nothing to read about why. Per the house rule (never hide, disable), the pill now
 * stays in its place looking inert and, when pressed, says what is missing instead of
 * firing an error toast.
 *
 * For a Beratungsstelle without a single Fachbereich the dialog carries the operator
 * disclaimer: such a centre cannot offer certified counselling under the
 * data-protection and consent requirements, and continuing to run it is the
 * operator's own risk.
 */
export const ConsentUnavailableNotice = ({ reason, language }: ConsentUnavailableNoticeProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);
    const noDepartments = reason === 'noDepartments';
    const languageName = t(`language.${language}`, language.toUpperCase());

    return (
        <>
            <SplitButton
                // The consent glyph (checkbox), not the template document icon the real
                // control carries: nothing is being chosen here, so a chooser's icon
                // would promise a menu that does not exist.
                icon={<LegalConsentHeadIcon />}
                // Same label as the live control, so it stays readable WHICH action is
                // unavailable — the point of showing the pill at all.
                label={t('legal.consent.editButton')}
                // Overrides the accessible name on purpose: the visible label names the
                // action, the name has to say that the action is not the one this press
                // performs. It repeats the visible label, so "Label in Name" holds.
                title={t('legal.consent.unavailable.trigger')}
                variant="outlined"
                size="small"
                className={styles.unavailable}
                mainTestId="consent-unavailable-trigger"
                onClick={() => setOpen(true)}
            />
            {open && (
                <Modal
                    icon={<LegalConsentHeadIcon />}
                    titleKey="legal.consent.unavailable.dialog.title"
                    descriptionKey={
                        noDepartments
                            ? 'legal.consent.unavailable.noDepartments.description'
                            : 'legal.consent.unavailable.allDepartments.description'
                    }
                    okLabelKey="legal.consent.unavailable.gotIt"
                    width={560}
                    onConfirm={close}
                    onClose={close}
                >
                    <div className={styles.body} data-testid="consent-unavailable-body">
                        {noDepartments ? (
                            <>
                                {/* The disclaimer is a legal statement in a specific
                                    language; naming that language keeps it from reading
                                    as a stray block of foreign text. */}
                                <span className={styles.disclaimerCaption}>
                                    {t('legal.consent.unavailable.noDepartments.disclaimerLabel', {
                                        language: languageName,
                                    })}
                                </span>
                                <p className={styles.disclaimer} data-testid="consent-unavailable-disclaimer">
                                    {consentDisclaimerFor(language)}
                                </p>
                            </>
                        ) : (
                            <p className={styles.explanation}>{t('legal.consent.unavailable.allDepartments.text')}</p>
                        )}
                    </div>
                </Modal>
            )}
        </>
    );
};

export default ConsentUnavailableNotice;
