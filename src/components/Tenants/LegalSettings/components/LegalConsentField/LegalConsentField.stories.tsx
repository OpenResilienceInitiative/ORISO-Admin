import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves in Storybook/Vite
import { expect, userEvent, within } from 'storybook/test';
import { LegalConsentField } from './index';

/**
 * Consent sentence of the data-protection policy (ADR-021 decision 4).
 * #862: closed surface is only the in-card CTA; the editor opens in a dialog.
 */
const meta = {
    title: 'Organisms/Legal/LegalConsentField',
    component: LegalConsentField,
    parameters: { layout: 'padded' },
    args: { language: 'de', onChange: () => undefined },
} satisfies Meta<typeof LegalConsentField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A valid sentence: the mandatory token is present, publication is possible. */
export const Valid: Story = {
    args: {
        value: 'Ich habe die {{legal_links}} der {{Beratungsstelle}} zum Thema {{Thema}} zur Kenntnis genommen.',
    },
};

/**
 * The blocked state: the sentence dropped `{{legal_links}}`, so the help-seeker
 * could not reach the documents being agreed to. Publishing is refused here and
 * on the server (ADR-021 decision 2).
 */
export const MissingMandatoryToken: Story = {
    args: {
        value: 'Ich bin mit der Verarbeitung meiner Daten einverstanden.',
    },
};

/**
 * Nothing authored yet: the dialog opens with the platform template written in, instead of a
 * notice about what applies while the field is empty (owner call 2026-09-23).
 */
export const EmptyOpensWithTemplate: Story = {
    args: { value: '' },
    play: async ({ canvasElement }) => {
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.click(await page.findByTestId('consent-edit-trigger'));
        const dialog = await page.findByRole('dialog');
        await expect((within(dialog).getByRole('textbox') as HTMLTextAreaElement).value).toContain('{{legal_links}}');
        await expect(within(dialog).queryByTestId('consent-inherited-notice')).toBeNull();
    },
};

/** A viewer without the legal-text permission reads, but cannot type. */
export const ReadOnly: Story = {
    args: {
        value: 'Ich habe die {{legal_links}} zur Kenntnis genommen.',
        readOnly: true,
    },
};

/** Live editing: type into the field and watch the preview and the error follow. */
export const Editable: Story = {
    args: { value: '' },
    render: (args) => {
        const ControlledConsent = () => {
            const [value, setValue] = useState(args.value);
            return <LegalConsentField {...args} value={value} onChange={setValue} />;
        };
        return <ControlledConsent />;
    },
};
