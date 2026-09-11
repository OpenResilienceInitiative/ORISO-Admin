import { useTranslation } from 'react-i18next';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { SplitDropdown } from '../FormPluginEditor/SplitDropdown';
import type { PlaceholderTokenDef } from './placeholderTokens';
import styles from './PlaceholderTemplateEditor.module.scss';

export interface TokenPickerProps {
    /** Tokens offered in the menu; picking one calls {@link TokenPickerProps.onInsert}. */
    tokens: PlaceholderTokenDef[];
    /** Fired with the token key — the field owns caret handling and value updates. */
    onInsert: (key: string) => void;
    /** Read-only surfaces keep the picker visible but inert. */
    disabled?: boolean;
}

/**
 * Placeholder-token picker: the M3 split button the legal editors already use
 * (reused {@link SplitDropdown}, Figma 1252-37231), opening a menu of the
 * available tokens with their human labels. Picking an entry inserts `{{key}}`
 * — replacing the hardcoded `<code>` token hint under the old template forms.
 */
export const TokenPicker = ({ tokens, onInsert, disabled = false }: TokenPickerProps) => {
    const { t } = useTranslation();
    const label = t('placeholderTemplate.insertToken', 'Platzhalter einfügen');

    return (
        <SplitDropdown
            disabled={disabled}
            icon={<DataObjectIcon />}
            label={label}
            title={label}
            menu={{
                items: tokens.map((token) => ({
                    key: token.key,
                    label: (
                        <span className={styles.tokenMenuRow}>
                            <span>{t(token.labelKey, token.labelFallback)}</span>
                            {/* Literal template syntax, deliberately outside t() — i18next
                                would try to interpolate the {{…}} braces. */}
                            <code className={styles.tokenCode}>{`{{${token.key}}}`}</code>
                        </span>
                    ),
                })),
                onClick: ({ key }) => onInsert(key),
            }}
        />
    );
};
