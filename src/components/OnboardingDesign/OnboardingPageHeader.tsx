import type { ReactNode } from 'react';
import styles from './styles.module.scss';

export interface OnboardingPageHeaderProps {
    /** Flow indicator, lead art, or both — rendered above the heading. */
    lead?: ReactNode;
    title: string;
    /** One short sentence. The existing-account text is the model for density. */
    intro?: string;
    /** Small uppercase label above `value`, e.g. "E-Mail-Adresse". */
    kicker?: string;
    /** The fact the kicker names, shown once, e.g. the invited address. */
    value?: string;
}

/**
 * The one header of every invited-account page: lead graphic or flow, a single
 * heading, one sentence, and the invited identity shown once. Replaces the
 * hand-rolled H1 blocks of the Träger, counsellor, reset and link-error pages.
 */
export const OnboardingPageHeader = ({ lead, title, intro, kicker, value }: OnboardingPageHeaderProps) => (
    <header className={styles.header}>
        {lead}
        <h1 className={styles.title}>{title}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
        {kicker && <p className={styles.kicker}>{kicker}</p>}
        {value && <p className={styles.value}>{value}</p>}
    </header>
);
