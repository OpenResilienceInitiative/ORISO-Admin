import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import classNames from 'classnames';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TileHelpButton, type TileHelpTopic } from '../../../../TileHelp';
import styles from './styles.module.scss';

export type TileSectionProps = {
    title: string;
    /** One or two sentences under the heading: what this is for. */
    description?: ReactNode;
    /** Id for the heading, when a control inside is named by it (e.g. a radiogroup). */
    titleId?: string;
    dataTestId?: string;
    /** The explanation (slideshow) behind the section's info button. */
    help?: TileHelpTopic;
    /** The feature page on ORISO Understand. */
    learnMoreHref?: string;
    /** Folds up to its heading (default open). */
    collapsible?: boolean;
    defaultOpen?: boolean;
    children: ReactNode;
};

/**
 * ORISO-Admin#1558: one section of a conversation-type tile in Funktionszugriff, on its own surface
 * with a left-aligned heading, a description, the explanation and a link to the feature page. A
 * long section folds up to its heading like a small tile.
 */
export const TileSection = ({
    title,
    description,
    titleId,
    dataTestId,
    help,
    learnMoreHref,
    collapsible = false,
    defaultOpen = true,
    children,
}: TileSectionProps) => {
    const { t } = useTranslation();
    const generatedId = useId();
    const headingId = titleId ?? generatedId;
    const bodyId = `${headingId}-body`;
    const [open, setOpen] = useState(defaultOpen);
    const expanded = !collapsible || open;

    return (
        <section
            className={classNames(styles.section, { [styles.folded]: !expanded })}
            aria-labelledby={headingId}
            data-testid={dataTestId}
        >
            <div className={styles.header}>
                <h4 className={styles.heading}>
                    {collapsible ? (
                        <button
                            type="button"
                            className={styles.toggle}
                            aria-expanded={open}
                            aria-controls={bodyId}
                            onClick={() => setOpen(!open)}
                        >
                            <span id={headingId} className={styles.title}>
                                {title}
                            </span>
                            <ExpandMoreIcon className={styles.chevron} aria-hidden />
                        </button>
                    ) : (
                        <span id={headingId} className={styles.title}>
                            {title}
                        </span>
                    )}
                </h4>
                {help && (
                    <span className={styles.help}>
                        <TileHelpButton topic={help} tileTitle={title} />
                    </span>
                )}
            </div>
            {(description || learnMoreHref) && (
                <div className={styles.description}>
                    {description}
                    {learnMoreHref && (
                        <>
                            {' '}
                            <a href={learnMoreHref} target="_blank" rel="noreferrer" className={styles.learnMore}>
                                {t('tenants.permissions.section.learnMore')}
                                <OpenInNewIcon aria-hidden className={styles.learnMoreIcon} />
                                <span className={styles.visuallyHidden}>{t('tenants.permissions.section.newTab')}</span>
                            </a>
                        </>
                    )}
                </div>
            )}
            <div id={bodyId} className={styles.body} hidden={!expanded}>
                {children}
            </div>
        </section>
    );
};
