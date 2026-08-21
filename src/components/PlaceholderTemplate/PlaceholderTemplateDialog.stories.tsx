import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlaceholderTemplateDialog } from './PlaceholderTemplateDialog';
import { InviteEmailTemplateEditor, type InviteEmailTemplateValues } from './InviteEmailTemplateEditor';
import { LegalConsentTemplateEditor, type LegalConsentTemplateValues } from './LegalConsentTemplateEditor';
import type { PlaceholderTemplateDefinition } from './PlaceholderTemplateEditor';

const meta = {
    title: 'Organisms/PlaceholderTemplateEditor/In Dialog',
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'The placeholder-template module inside the house M3 dialog (Organisms/Modal): centered title + description, the editor with template split button and live preview as the body, divider and Abbrechen/Speichern text buttons. This is the shell the invite wiring (#746) and the legal editors embed — the full-page stories exist only to inspect the bare module.',
            },
        },
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const inviteTemplates: PlaceholderTemplateDefinition<InviteEmailTemplateValues>[] = [
    {
        id: 1,
        name: 'Standard-Einladung',
        values: {
            subject: 'Ihre Einladung zur Beratungsplattform, {{firstName}}',
            body:
                'Hallo {{firstName}} {{lastName}},\n\n' +
                'Sie wurden mit der Adresse {{email}} zur Beratungsplattform eingeladen.\n' +
                'Über diesen Link richten Sie Ihren Zugang ein:\n\n{{inviteLink}}\n\n' +
                'Viele Grüße\nIhr Team (Träger {{tenantId}})',
        },
    },
    {
        id: 2,
        name: 'Kurzfassung',
        values: {
            subject: 'Ihr Zugang',
            body: 'Hallo {{firstName}},\nhier ist Ihr Einladungslink: {{inviteLink}}',
        },
    },
];

const InviteDialogDemo = () => {
    const [activeTemplateId, setActiveTemplateId] = useState<number | string>(1);
    const [values, setValues] = useState<InviteEmailTemplateValues>(inviteTemplates[0].values);

    const loadTemplate = (id: number | string) => {
        const template = inviteTemplates.find((entry) => entry.id === id);
        if (template) {
            setActiveTemplateId(template.id);
            setValues(template.values);
        }
    };

    return (
        <PlaceholderTemplateDialog
            titleKey="placeholderTemplate.dialog.inviteTitle"
            descriptionKey="placeholderTemplate.dialog.inviteDescription"
            onSave={() => undefined}
            onClose={() => undefined}
        >
            <InviteEmailTemplateEditor
                activeTemplateId={activeTemplateId}
                templates={inviteTemplates}
                values={values}
                onChange={setValues}
                onCreateFromTemplate={loadTemplate}
                onSelectTemplate={loadTemplate}
            />
        </PlaceholderTemplateDialog>
    );
};

export const InviteEmailInDialog: Story = {
    render: () => <InviteDialogDemo />,
};

const legalTemplates: PlaceholderTemplateDefinition<LegalConsentTemplateValues>[] = [
    {
        id: 1,
        name: 'Standard-Einwilligung',
        values: {
            text:
                'Ich habe die {{legal_links}} der Beratungsstelle {{Beratungsstelle}} zur Kenntnis genommen. ' +
                'Für Authentifizierung und Navigation verwendet diese Webseite Cookies.',
        },
    },
];

const LegalDialogDemo = () => {
    const [values, setValues] = useState<LegalConsentTemplateValues>(legalTemplates[0].values);

    return (
        <PlaceholderTemplateDialog
            titleKey="placeholderTemplate.dialog.legalTitle"
            descriptionKey="legal.consent.description"
            onSave={() => undefined}
            onClose={() => undefined}
        >
            <LegalConsentTemplateEditor
                activeTemplateId={1}
                templates={legalTemplates}
                values={values}
                onChange={setValues}
                onSelectTemplate={() => undefined}
            />
        </PlaceholderTemplateDialog>
    );
};

export const LegalConsentInDialog: Story = {
    render: () => <LegalDialogDemo />,
};
