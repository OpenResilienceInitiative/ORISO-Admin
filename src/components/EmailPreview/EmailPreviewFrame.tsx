import classNames from 'classnames';
import styles from './styles.module.scss';

export interface EmailPreviewFrameProps {
    /**
     * A COMPLETE HTML document as returned by the backend preview endpoint. It is handed to the
     * frame verbatim — no sanitising, no re-styling, no rewriting. The document is what SMTP
     * receives; changing it here would re-create the drift ORISO-UserService#914 removes.
     */
    html: string;
    /** Accessible name of the frame (axe: `frame-title`). */
    title: string;
    /** Rendering width in px — 390 reproduces the narrow mobile mail client. */
    width?: number;
    /** Visible height in px; the mail scrolls inside the frame. */
    height?: number;
    className?: string;
    dataTestId?: string;
}

/**
 * Renders emailed HTML isolated from the Admin app (ORISO-UserService#914).
 *
 * `srcDoc` + an empty `sandbox` puts the document in its own opaque origin: the Admin's CSS and
 * fonts cannot leak in and change how the mail looks, no script in the mail can run, and the
 * sample call-to-action cannot navigate the Admin away. That is the only honest way to show mail
 * markup — rendering it inline would show the mail as the Admin styles it, not as a mail client
 * would.
 */
export const EmailPreviewFrame = ({
    html,
    title,
    width,
    height = 620,
    className,
    dataTestId,
}: EmailPreviewFrameProps) => (
    <div className={classNames(styles.frameWrapper, className)}>
        <iframe
            className={styles.frame}
            data-testid={dataTestId}
            title={title}
            srcDoc={html}
            sandbox=""
            style={{ width: width ? `${width}px` : '100%', height: `${height}px` }}
        />
    </div>
);
