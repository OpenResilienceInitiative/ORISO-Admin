import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmailKitPreview } from './EmailKitPreview';
import {
    PlaceholderTemplateEditor,
    type PlaceholderTemplateDefinition,
    type PlaceholderTemplateFieldConfig,
} from './PlaceholderTemplateEditor';
import { fillPlaceholders, INVITE_EMAIL_TOKENS, sampleValues, type PlaceholderTokenDef } from './placeholderTokens';

export interface InviteEmailTemplateValues extends Record<string, string> {
    subject: string;
    body: string;
}

export interface InviteEmailTemplateEditorProps {
    values: InviteEmailTemplateValues;
    onChange: (next: InviteEmailTemplateValues) => void;
    templates: PlaceholderTemplateDefinition<InviteEmailTemplateValues>[];
    activeTemplateId?: number | string;
    onSelectTemplate: (id: number | string) => void;
    onCreateFromTemplate?: (id: number | string) => void;
    /** Main-segment press of the template split button (e.g. show the template manager). */
    onManageTemplates?: () => void;
    /**
     * Token set offered by the pickers and substituted in the preview.
     * Defaults to the shared invite set; pass `inviteEmailTokensForKind(kind)`
     * for the per-kind wiring (#746).
     */
    tokens?: PlaceholderTokenDef[];
}

/**
 * Variant 1 — invite e-mail template: subject + body with the exact token set
 * the UserService `AccountInviteService` substitutes, previewed live in the
 * NEW transactional e-mail design system ({@link EmailKitPreview}, ported from
 * ORISO-Frontend `src/emails/`) with synthetic sample values. Unknown tokens
 * stay visible as highlighted `{{key}}` chips.
 */
export const InviteEmailTemplateEditor = ({
    values,
    onChange,
    templates,
    activeTemplateId,
    onSelectTemplate,
    onCreateFromTemplate,
    onManageTemplates,
    tokens = INVITE_EMAIL_TOKENS,
}: InviteEmailTemplateEditorProps) => {
    const { t } = useTranslation();
    const samples = useMemo(() => sampleValues(tokens), [tokens]);

    const fields: PlaceholderTemplateFieldConfig<InviteEmailTemplateValues>[] = [
        { name: 'subject', label: t('placeholderTemplate.invite.subject', 'Betreff') },
        { name: 'body', label: t('placeholderTemplate.invite.body', 'Inhalt'), multiline: true, rows: 8 },
    ];

    return (
        <PlaceholderTemplateEditor
            activeTemplateId={activeTemplateId}
            fields={fields}
            heading={t('placeholderTemplate.invite.heading', 'Einladungs-E-Mail')}
            preview={
                <EmailKitPreview
                    body={fillPlaceholders(values.body, samples)}
                    previewLabel={t('placeholderTemplate.invite.previewLabel', 'E-Mail-Vorschau')}
                    subject={fillPlaceholders(values.subject, samples)}
                />
            }
            templates={templates}
            tokens={tokens}
            values={values}
            onChange={onChange}
            onCreateFromTemplate={onCreateFromTemplate}
            onManageTemplates={onManageTemplates}
            onSelectTemplate={onSelectTemplate}
        />
    );
};
