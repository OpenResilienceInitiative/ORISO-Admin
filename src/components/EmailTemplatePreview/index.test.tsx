import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmailTemplatePreview, EmailTemplatePreviewProps } from '.';

const baseProps: EmailTemplatePreviewProps = {
    previewLabel: 'Email preview',
    subject: 'Your ORISO invitation',
    body: 'Hello {{firstName}}, your invitation is ready.',
};

describe('EmailTemplatePreview', () => {
    it('keeps template placeholders visible without interpreting them as HTML', () => {
        render(<EmailTemplatePreview {...baseProps} />);

        const preview = screen.getByRole('region', { name: 'Email preview' });
        expect(within(preview).getByText('{{firstName}}')).toBeInTheDocument();
        expect(within(preview).queryByRole('link')).not.toBeInTheDocument();
    });

    it('renders a 2FA code as one accessible selectable value', () => {
        const otpProps = {
            ...baseProps,
            subject: 'Your ORISO 2FA code',
            code: '123456',
            codeLabel: 'Your 2FA code: 123456',
            supportingText: 'The code is valid for 15 minutes.',
        } as EmailTemplatePreviewProps & {
            code: string;
            codeLabel: string;
            supportingText: string;
        };

        render(<EmailTemplatePreview {...otpProps} />);

        const code = screen.getByLabelText('Your 2FA code: 123456');
        expect(code).toHaveTextContent('123456');
        expect(code.className).toMatch(/code/);
        expect(screen.getByText('The code is valid for 15 minutes.')).toBeInTheDocument();
    });

    it('renders an invite action with its explicit label and safe example URL', () => {
        const inviteProps = {
            ...baseProps,
            action: {
                label: 'Accept tenant invitation',
                href: 'https://admin.example.invalid/invite/tenant-demo',
            },
        } as EmailTemplatePreviewProps & {
            action: { label: string; href: string };
        };

        render(<EmailTemplatePreview {...inviteProps} />);

        expect(screen.getByRole('link', { name: 'Accept tenant invitation' })).toHaveAttribute(
            'href',
            'https://admin.example.invalid/invite/tenant-demo',
        );
    });
});
