import { useId, type ReactNode } from 'react';
import styles from './styles.module.scss';

export type TileSectionProps = {
    title: string;
    /** One or two sentences under the heading. */
    description?: ReactNode;
    /** Id for the heading, when a control inside is named by it (e.g. a radiogroup). */
    titleId?: string;
    dataTestId?: string;
    children: ReactNode;
};

/**
 * ORISO-Admin#1558: one section of a conversation-type tile in Funktionszugriff, set apart on its own
 * surface with a left-aligned heading, so a long tile reads as a list of topics instead of one wall
 * of switches.
 */
export const TileSection = ({ title, description, titleId, dataTestId, children }: TileSectionProps) => {
    const generatedId = useId();
    const headingId = titleId ?? generatedId;
    return (
        <section className={styles.section} aria-labelledby={headingId} data-testid={dataTestId}>
            <h4 id={headingId} className={styles.title}>
                {title}
            </h4>
            {description && <div className={styles.description}>{description}</div>}
            {children}
        </section>
    );
};
