import { useMemo } from 'react';
import { GavelOutlined } from '@mui/icons-material';
import { M3RichTextEditor } from '../FormPluginEditor/M3RichTextEditor';
import { EditorHelpText } from '../FormPluginEditor/EditorHelpText';
import { ensureHeadingAnchorIds } from '../FormPluginEditor/headingAnchors';
import styles from './styles.module.scss';

export interface DpaLegalReaderProps {
    /** Sanitized HTML of the published legal text (the host applies DOMPurify). */
    html: string;
    /** Card title and accessible name of the scrollable text region. */
    label: string;
    /** Optional intro line, rendered in the canonical "Editor Help Texts" block. */
    description?: React.ReactNode;
    /**
     * Drops the card's icon + title row for hosts that already state the
     * agreement's name above the card (the DPA blocker). `label` stays the
     * accessible name of the reading region either way.
     */
    hideHeader?: boolean;
    /** Language the legal text is written in — drives hyphenation of long compounds. */
    contentLanguage?: string;
    testId?: string;
}

/**
 * The DPA/AVV reader used by BOTH public surfaces — the U8 tenant-admin
 * onboarding step and the U10 DPA blocker (#594).
 *
 * It owns no navigation of its own: the canonical read-only rich-text card
 * ({@link M3RichTextEditor}) brings the "Chapter Navbar" chip row
 * (`AnchorChips`, Figma 1299-81676), the fullscreen reading mode and the
 * in-text `#anchor` cross references. Picking a chapter scrolls the host
 * surface to that heading and moves keyboard focus to it.
 *
 * Scrolling (#594.3): the card is `fluid`, i.e. it is NOT a scroll container.
 * Its host scrolls — the viewport-bounded sheet on the desktop, the page on a
 * phone — so a step containing a 60-page agreement can be bounded and centred,
 * and the screen never stacks two scrollbars (#572). The chapter chips stay
 * usable because they stick to the bottom of the active scrollport.
 *
 * The only thing added here is `ensureHeadingAnchorIds`: the read-only card
 * deliberately never mutates its document, so legal texts published before the
 * anchor feature would otherwise render without any chapters.
 */
export const DpaLegalReader = ({
    html,
    label,
    description,
    hideHeader,
    contentLanguage,
    testId = 'dpa-text',
}: DpaLegalReaderProps) => {
    const anchoredHtml = useMemo(() => ensureHeadingAnchorIds(html), [html]);

    return (
        <div className={styles.reader} data-testid={testId}>
            <M3RichTextEditor
                readOnly
                fluid
                enableAnchors
                contentLanguage={contentLanguage}
                hideHeader={hideHeader}
                title={label}
                icon={GavelOutlined}
                value={anchoredHtml}
                helpSlot={description ? <EditorHelpText text={description} /> : undefined}
            />
        </div>
    );
};

export default DpaLegalReader;
