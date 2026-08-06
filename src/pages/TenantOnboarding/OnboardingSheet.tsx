import type { ReactNode } from 'react';
import styles from './styles.module.scss';

/**
 * The surface every public onboarding screen sits on (#594.8).
 *
 * It is the same sheet the product's reference dialog uses
 * (`Organisms/Modal`): the NEUTRAL `--m3-surface-container-high` tone with a
 * 28px radius, fields tonal on it rather than white boxes punched into a
 * tinted page, and the accent left to the actions.
 *
 * It is also what makes the desktop centring real (#594.3): from 1200px up the
 * sheet is bounded to the viewport and its body is the only scroller, so the
 * column's `margin-block: auto` finally has free space to distribute. Below
 * that it is an ordinary block and the page scrolls (#569, 390x844).
 */
export const OnboardingSheet = ({ children }: { children: ReactNode }) => (
    <div className={styles.sheet} data-testid="onboarding-sheet">
        <div className={styles.sheetBody}>{children}</div>
    </div>
);

export default OnboardingSheet;
