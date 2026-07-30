import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmailTemplatePreview } from '.';

const meta = {
    title: 'Organisms/Email/EmailTemplatePreview',
    component: EmailTemplatePreview,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'The shared visual contract for ORISO transactional email. The same shell previews 2FA codes, tenant invitations and agency/counsellor invitations without copying layout or using live credentials.',
            },
        },
    },
    decorators: [
        (Story) => (
            <div style={{ width: 'min(760px, calc(100vw - 32px))' }}>
                <Story />
            </div>
        ),
    ],
    args: {
        previewLabel: 'E-Mail-Vorschau',
        subject: 'Ihr Zugang zu ORISO',
        body: 'Hallo {{firstName}},\n\nIhre Einladung ist bereit.',
    },
} satisfies Meta<typeof EmailTemplatePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoFactorCode: Story = {
    args: {
        subject: 'Ihr ORISO 2FA-Code',
        body: 'Geben Sie diesen Code im geöffneten ORISO-Fenster ein.',
        code: '123456',
        codeLabel: 'Beispielhafter 2FA-Code: 123456',
        supportingText: 'Der Beispielcode ist 15 Minuten gültig. Er ist kein echter Einmalcode.',
    },
};

export const TenantInvite: Story = {
    args: {
        subject: 'Ihre Einladung als Träger-Admin',
        body: 'Hallo {{firstName}} {{lastName}},\n\nrichten Sie jetzt den Zugang für Ihren Träger ein.',
        action: {
            label: 'Träger-Einladung annehmen',
            href: 'https://admin.example.invalid/invite/tenant-demo',
        },
        supportingText: 'Dieser Storybook-Link ist synthetisch und kann keine Einladung aktivieren.',
    },
};

export const AgencyInvite: Story = {
    args: {
        subject: 'Ihre Einladung zur Beratungsstelle',
        body: 'Hallo {{firstName}},\n\nSie wurden einer Beratungsstelle im Träger {{tenantId}} zugeordnet.',
        action: {
            label: 'Einladung zur Beratungsstelle annehmen',
            href: 'https://app.example.invalid/invite/agency-demo',
        },
        supportingText: 'Dieser Storybook-Link ist synthetisch und kann kein Konto freischalten.',
    },
};

export const LongContentMobile: Story = {
    args: {
        subject: 'Ihre Einladung zur Beratungsplattform',
        body:
            'Hallo {{firstName}} {{lastName}},\n\nmit dieser Einladung richten Sie Ihren Zugang ein. ' +
            'Prüfen Sie anschließend die Angaben zu Ihrer Organisation und schließen Sie die erforderlichen Schritte ab.\n\n' +
            'Die Einladung gehört zu {{email}} und dem Träger {{tenantId}}.',
        action: {
            label: 'Einladung öffnen',
            href: 'https://admin.example.invalid/invite/long-demo',
        },
        supportingText:
            'Wenn Sie diese Einladung nicht erwartet haben, können Sie die E-Mail ignorieren. Der Beispiel-Link ist nicht aktiv.',
    },
    decorators: [
        (Story) => (
            <div style={{ width: 390, maxWidth: 'calc(100vw - 24px)' }}>
                <Story />
            </div>
        ),
    ],
};
