import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import i18n from 'i18next';
import { PHONE_390 } from '../DpaLegalForm/dpaStoryText';
import { LegalNoticeDialog } from './LegalNoticeDialog';

/**
 * The text box behind the footer's Imprint / Privacy entries.
 *
 * Two things were wrong in the 100%-zoom review and are pinned here: the hero
 * icon was a generic MUI gavel instead of the product's own legal icons, and
 * the close action was wired to `btn.close` — a key that exists in no locale,
 * so it rendered the raw key to every visitor.
 */
const meta = {
    title: 'Organisms/LegalNoticeDialog',
    component: LegalNoticeDialog,
    parameters: { layout: 'fullscreen' },
    args: { onClose: () => {} },
} satisfies Meta<typeof LegalNoticeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Imprint: Story = { args: { kind: 'imprint' } };

export const Privacy: Story = { args: { kind: 'privacy' } };

export const PrivacyOnPhone: Story = {
    args: { kind: 'privacy' },
    parameters: { layout: 'fullscreen', ...PHONE_390.parameters },
    globals: PHONE_390.globals,
};

/**
 * ⚠️ The acceptance case. The placeholder copy is three paragraphs; the
 * PUBLISHED imprint and privacy notice are pages, and that is what this dialog
 * will show once `legalNoticeContent` is wired to the stored texts. The sheet
 * must stay inside the viewport with the title and the close action visible —
 * only the text scrolls.
 */
const LONG_BODY = Array.from(
    { length: 24 },
    (_, index) =>
        `§ ${index + 1} — Dies ist ein Absatz in der Länge, die ein veröffentlichter Rechtstext tatsächlich hat. ` +
        'Er beschreibt Zwecke, Rechtsgrundlagen, Speicherdauer und Empfänger personenbezogener Daten und ist ' +
        'bewusst so lang, dass der Text im Dialog scrollen muss, statt den Dialog über den Bildschirmrand zu schieben.',
).join('\n\n');

const withLongBody = (Story: () => ReactNode) => {
    /* The dots are part of the key: src/i18n.ts sets `keySeparator: false`
       globally and `addResource` inherits it, so `footer.legal.privacy.body` is
       a single flat key. The placeholder body is already in the bundle, so the
       resource has to be overwritten explicitly. */
    ['de', 'en'].forEach((language) => {
        i18n.addResource(language, 'translations', 'footer.legal.privacy.body', LONG_BODY, {
            silent: true,
        });
    });
    return <Story />;
};

export const LongPublishedText: Story = {
    args: { kind: 'privacy' },
    decorators: [withLongBody],
};

export const LongPublishedTextOnPhone: Story = {
    args: { kind: 'privacy' },
    decorators: [withLongBody],
    parameters: { layout: 'fullscreen', ...PHONE_390.parameters },
    globals: PHONE_390.globals,
};
