import { useTranslation } from 'react-i18next';
import { EmailKitPreview } from './EmailKitPreview';
import {
    PlaceholderTemplateEditor,
    type PlaceholderTemplateDefinition,
    type PlaceholderTemplateFieldConfig,
} from './PlaceholderTemplateEditor';
import { INVITE_EMAIL_TOKENS } from './placeholderTokens';
import { type InviteEmailTemplateKind } from '../../api/accountInvites/accountInvites';

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
    /** Template kind handed to the renderer so it picks the matching samples. */
    kind?: InviteEmailTemplateKind;
}

/**
 * Variant 1 — invite e-mail template: subject + body with the exact token set
 * the UserService `AccountInviteService` substitutes, previewed live through
 * {@link EmailKitPreview}.
 *
 * The authored text is handed to the preview **raw**, tokens unresolved. The
 * editor deliberately does not substitute sample values itself any more: the
 * backend renderer substitutes for the preview *and* for the mail it sends, so
 * there is exactly one substitution implementation and it cannot drift. Doing it
 * here as well would put the author's view and the recipient's mail back on two
 * different code paths — a subtler version of the very defect E2 describes.
 */
export const InviteEmailTemplateEditor = ({
    values,
    onChange,
    templates,
    activeTemplateId,
    onSelectTemplate,
    onCreateFromTemplate,
    kind,
}: InviteEmailTemplateEditorProps) => {
    const { t } = useTranslation();

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
                    body={values.body}
                    kind={kind}
                    previewLabel={t('placeholderTemplate.invite.previewLabel', 'E-Mail-Vorschau')}
                    subject={values.subject}
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
