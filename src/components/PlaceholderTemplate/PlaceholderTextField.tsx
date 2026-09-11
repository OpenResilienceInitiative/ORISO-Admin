import { useCallback, useId, useRef } from 'react';
import { Input, type InputRef } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { insertPlaceholder, type PlaceholderTokenDef } from './placeholderTokens';
import { TokenPicker } from './TokenPicker';
import styles from './PlaceholderTemplateEditor.module.scss';

export interface PlaceholderTextFieldProps {
    /** Visible field label (also the accessible name of the input). */
    label: string;
    value: string;
    onChange: (next: string) => void;
    /** Tokens offered by the field's own picker. */
    /** Tokens the field's picker offers; omit to render the field without a picker (D1). */
    tokens?: PlaceholderTokenDef[];
    /** Renders a textarea instead of a single-line input. */
    multiline?: boolean;
    rows?: number;
    /**
     * Read-only surface: input and token picker stay visible but inert. Suppressing
     * only `onChange` would leave a field that accepts keystrokes and snaps back —
     * an editable-looking control for someone who may not edit.
     */
    disabled?: boolean;
}

/**
 * Labelled text field with its own `{{token}}` picker: picking a token inserts
 * it at the caret (or over the selection) and puts the caret behind the token.
 * Presentational and controlled — validation and persistence stay with the
 * embedding form.
 */
export const PlaceholderTextField = ({
    label,
    value,
    onChange,
    tokens,
    multiline = false,
    rows = 6,
    disabled = false,
}: PlaceholderTextFieldProps) => {
    const fieldId = useId();
    const inputRef = useRef<InputRef>(null);
    const textAreaRef = useRef<TextAreaRef>(null);
    // Whether the user ever put a caret into the field: before that,
    // selectionStart is a meaningless 0 and tokens belong at the end.
    const touchedRef = useRef(false);

    const nativeElement = useCallback(
        (): HTMLInputElement | HTMLTextAreaElement | null =>
            multiline ? textAreaRef.current?.resizableTextArea?.textArea ?? null : inputRef.current?.input ?? null,
        [multiline],
    );

    const handleInsert = useCallback(
        (key: string) => {
            const element = nativeElement();
            const caretKnown = touchedRef.current && element != null;
            const start = caretKnown ? element.selectionStart ?? value.length : value.length;
            const end = caretKnown ? element.selectionEnd ?? start : value.length;
            const inserted = insertPlaceholder(value, start, end, key);
            onChange(inserted.value);
            // Hand the caret back to where writing continues — after React applied
            // the new value, hence the frame delay.
            requestAnimationFrame(() => {
                const target = nativeElement();
                if (target) {
                    target.focus();
                    target.setSelectionRange(inserted.cursor, inserted.cursor);
                }
            });
        },
        [nativeElement, onChange, value],
    );

    const markTouched = useCallback(() => {
        touchedRef.current = true;
    }, []);

    return (
        <div className={styles.field}>
            <div className={styles.fieldHead}>
                <label className={styles.fieldLabel} htmlFor={fieldId}>
                    {label}
                </label>
                {tokens ? <TokenPicker disabled={disabled} tokens={tokens} onInsert={handleInsert} /> : null}
            </div>
            {multiline ? (
                <Input.TextArea
                    id={fieldId}
                    ref={textAreaRef}
                    disabled={disabled}
                    rows={rows}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onFocus={markTouched}
                />
            ) : (
                <Input
                    id={fieldId}
                    ref={inputRef}
                    disabled={disabled}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onFocus={markTouched}
                />
            )}
        </div>
    );
};
