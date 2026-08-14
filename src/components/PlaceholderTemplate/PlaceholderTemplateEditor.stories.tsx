import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { InviteEmailTemplateEditor, type InviteEmailTemplateValues } from './InviteEmailTemplateEditor';
import { LegalConsentTemplateEditor, type LegalConsentTemplateValues } from './LegalConsentTemplateEditor';
import type { PlaceholderTemplateDefinition } from './PlaceholderTemplateEditor';

const meta = {
    title: 'Organisms/PlaceholderTemplateEditor',
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Reusable placeholder-template module: `{{token}}` fields with a picker, template selection on the M3 split button, and a live preview that substitutes synthetic sample values while typing. The invite e-mail previews in the NEW transactional e-mail design system (ported from ORISO-Frontend `src/emails/`, see the `Email/*` stories there): branded header with the tenant primary colour, white card, kit typography and footer. Unknown tokens stay visible as `{{key}}` chips. Presentational only — persistence and wiring into InviteComposer / the legal editors follow after Storybook approval.',
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

/**
 * Stateful demo shell: what the embedding page will do once wired — load the
 * picked template into the draft, start a copy on "new from template".
 */
const InviteDemo = () => {
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
        <InviteEmailTemplateEditor
            activeTemplateId={activeTemplateId}
            templates={inviteTemplates}
            values={values}
            onChange={setValues}
            onCreateFromTemplate={loadTemplate}
            onSelectTemplate={loadTemplate}
        />
    );
};

export const InviteEmail: Story = {
    render: () => <InviteDemo />,
};

export const InviteEmailUnknownToken: Story = {
    name: 'Invite e-mail — unknown token stays visible',
    render: () => (
        <InviteEmailTemplateEditor
            activeTemplateId={1}
            templates={inviteTemplates}
            values={{
                subject: 'Einladung für {{firstName}}',
                body: 'Hallo {{firstName}},\ndieser Platzhalter existiert nicht: {{unbekannterPlatzhalter}}',
            }}
            onChange={() => {}}
            onSelectTemplate={() => {}}
        />
    ),
};

export const InviteEmailEmpty: Story = {
    name: 'Invite e-mail — empty draft keeps the shell intact',
    render: () => (
        <InviteEmailTemplateEditor
            activeTemplateId={1}
            templates={inviteTemplates}
            values={{ subject: '', body: '' }}
            onChange={() => {}}
            onSelectTemplate={() => {}}
        />
    ),
};

const legalTemplates: PlaceholderTemplateDefinition<LegalConsentTemplateValues>[] = [
    {
        id: 'registration',
        name: 'Registrierung',
        values: {
            text: 'Ich habe die {{legal_links}} der {{Beratungsstelle}} zum Thema {{Thema}} zur Kenntnis genommen und willige in die Verarbeitung meiner Daten ein.',
        },
    },
    {
        id: 'short',
        name: 'Kurzform',
        values: {
            text: 'Ich habe die {{legal_links}} zur Kenntnis genommen.',
        },
    },
];

const LegalDemo = () => {
    const [activeTemplateId, setActiveTemplateId] = useState<number | string>('registration');
    const [values, setValues] = useState<LegalConsentTemplateValues>(legalTemplates[0].values);

    const loadTemplate = (id: number | string) => {
        const template = legalTemplates.find((entry) => entry.id === id);
        if (template) {
            setActiveTemplateId(template.id);
            setValues(template.values);
        }
    };

    return (
        <LegalConsentTemplateEditor
            activeTemplateId={activeTemplateId}
            templates={legalTemplates}
            values={values}
            onChange={setValues}
            onCreateFromTemplate={loadTemplate}
            onSelectTemplate={loadTemplate}
        />
    );
};

export const LegalConsent: Story = {
    render: () => <LegalDemo />,
};
