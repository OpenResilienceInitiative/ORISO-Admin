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
    testId?: string;
}

/**
 * The DPA/AVV reader used by BOTH public surfaces — the U8 tenant-admin
 * onboarding step and the U10 DPA blocker (#594).
 *
 * It owns no navigation of its own: the canonical read-only rich-text card
 * ({@link M3RichTextEditor}) brings the "Chapter Navbar" chip row
 * (`AnchorChips`, Figma 1299-81676), the fullscreen reading mode and the
 * in-text `#anchor` cross references. Picking a chapter scrolls INSIDE the
 * text region and moves keyboard focus to that heading.
 *
 * The only thing added here is `ensureHeadingAnchorIds`: the read-only card
 * deliberately never mutates its document, so legal texts published before the
 * anchor feature would otherwise render without any chapters.
 */
export const DpaLegalReader = ({ html, label, description, testId = 'dpa-text' }: DpaLegalReaderProps) => {
    const anchoredHtml = useMemo(() => ensureHeadingAnchorIds(html), [html]);

    return (
        <div className={styles.reader} data-testid={testId}>
            <M3RichTextEditor
                readOnly
                fluid
                enableAnchors
                title={label}
                icon={GavelOutlined}
                value={anchoredHtml}
                helpSlot={description ? <EditorHelpText text={description} /> : undefined}
            />
        </div>
    );
};

export default DpaLegalReader;
