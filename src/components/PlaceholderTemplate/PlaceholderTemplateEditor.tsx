import type { ReactNode } from 'react';
import { PlaceholderTextField } from './PlaceholderTextField';
import { TemplateSplitButton, type TemplateOption } from './TemplateSplitButton';
import type { PlaceholderTokenDef } from './placeholderTokens';
import styles from './PlaceholderTemplateEditor.module.scss';

/** A selectable template: option metadata plus the field values it loads. */
export interface PlaceholderTemplateDefinition<V extends Record<string, string>> extends TemplateOption {
    values: V;
}

export interface PlaceholderTemplateFieldConfig<V extends Record<string, string>> {
    name: Extract<keyof V, string>;
    label: string;
    multiline?: boolean;
    rows?: number;
}

export interface PlaceholderTemplateEditorProps<V extends Record<string, string>> {
    /** Module heading (visible; also groups the editor for screen readers). */
    heading: string;
    fields: PlaceholderTemplateFieldConfig<V>[];
    /** Tokens every field's picker offers. */
    tokens: PlaceholderTokenDef[];
    /** Controlled draft values, keyed by field name. */
    values: V;
    onChange: (next: V) => void;
    templates: PlaceholderTemplateDefinition<V>[];
    activeTemplateId?: number | string;
    onSelectTemplate: (id: number | string) => void;
    onCreateFromTemplate?: (id: number | string) => void;
    /** Live preview column, computed by the variant from the current values. */
    preview: ReactNode;
    /**
     * Read-only surface (no edit permission, or looking at an archived version):
     * fields, token pickers and the template chooser go inert. They stay visible —
     * hiding them would also hide what this level offers.
     */
    readOnly?: boolean;
}

/**
 * Shared frame of the placeholder-template module: template split button in
 * the header, `{{token}}` fields on the left, live preview on the right
 * (stacking below 920px like the invite template dialog). Purely
 * presentational — loading a picked template into `values`, persistence and
 * validation stay with the caller.
 */
export const PlaceholderTemplateEditor = <V extends Record<string, string>>({
    heading,
    fields,
    tokens,
    values,
    onChange,
    templates,
    activeTemplateId,
    onSelectTemplate,
    onCreateFromTemplate,
    preview,
    readOnly = false,
}: PlaceholderTemplateEditorProps<V>) => (
    <section aria-label={heading} className={styles.editor}>
        <header className={styles.header}>
            <h3 className={styles.heading}>{heading}</h3>
            <TemplateSplitButton
                activeTemplateId={activeTemplateId}
                disabled={readOnly}
                templates={templates}
                onCreateFromTemplate={onCreateFromTemplate}
                onSelectTemplate={onSelectTemplate}
            />
        </header>
        <div className={styles.formAndPreview}>
            <div className={styles.fields}>
                {fields.map((field) => (
                    <PlaceholderTextField
                        key={field.name}
                        disabled={readOnly}
                        label={field.label}
                        multiline={field.multiline}
                        rows={field.rows}
                        tokens={tokens}
                        value={values[field.name] ?? ''}
                        onChange={(next) => onChange({ ...values, [field.name]: next })}
                    />
                ))}
            </div>
            <div className={styles.preview}>{preview}</div>
        </div>
    </section>
);
