import styles from './PlaceholderTemplateEditor.module.scss';

/** Same token-highlighting split the e-mail-kit preview document uses. */
const TOKEN_SPLIT = /({{[^{}]+}})/g;
const TOKEN_ONLY = /^{{[^{}]+}}$/;

/**
 * Renders text with any remaining `{{token}}` highlighted as code chips —
 * the visual contract for "this placeholder is still unresolved".
 */
export const TokenizedText = ({ text }: { text: string }) => (
    <>
        {text.split(TOKEN_SPLIT).map((part, index) =>
            TOKEN_ONLY.test(part) ? (
                <code className={styles.tokenChip} key={`${part}-${index}`}>
                    {part}
                </code>
            ) : (
                part
            ),
        )}
    </>
);
