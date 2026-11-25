import { HintText, type HintTextProps } from '../HintText';
import styles from './M3RichTextEditor.module.scss';

/**
 * A quiet state line under the editor's title row (aligned with `EditorHelpText`): the tile's own
 * text for a state that a pop-up announced as an event, for example "draft saved, not published".
 * Plain text, no surface; text buttons sit under it.
 */
export const EditorStatusLine = (props: HintTextProps) => (
    <div className={styles.statusRow}>
        <HintText {...props} />
    </div>
);

export default EditorStatusLine;
