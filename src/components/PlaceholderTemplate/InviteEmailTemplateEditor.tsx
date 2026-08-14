import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmailKitPreview } from './EmailKitPreview';
import {
    PlaceholderTemplateEditor,
    type PlaceholderTemplateDefinition,
    type PlaceholderTemplateFieldConfig,
} from './PlaceholderTemplateEditor';
import { fillPlaceholders, INVITE_EMAIL_TOKENS, sampleValues } from './placeholderTokens';

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
}: InviteEmailTemplateEditorProps) => {
    const { t } = useTranslation();
    const samples = useMemo(() => sampleValues(INVITE_EMAIL_TOKENS), []);

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
            tokens={INVITE_EMAIL_TOKENS}
            values={values}
            onChange={onChange}
            onCreateFromTemplate={onCreateFromTemplate}
            onSelectTemplate={onSelectTemplate}
        />
    );
};
