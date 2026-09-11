import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ReactComponent as MailIcon } from '../../resources/img/svg/oriso/mail_24px.svg';
import { ReactComponent as MailFilledIcon } from '../../resources/img/svg/oriso/mail_filled_24px.svg';
import { ReactComponent as SendIcon } from '../../resources/img/svg/oriso/send_400_24px.svg';
import { ReactComponent as SendFilledIcon } from '../../resources/img/svg/oriso/send_filled_24px.svg';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { GlobalSearchBar } from './GlobalSearchBar';
import { GlobalSearchMenu } from './GlobalSearchMenu';
import { SplitButton } from './SplitButton';

/**
 * Global search component family (Figma 1165:17005, "Search Bar Admin Panel"):
 * minimized-by-default search pill with an expand animation towards the right,
 * floating-label text fields, split buttons and the counselling frontend's menu
 * look & feel. Icons come from the ORISO icons master file (mail/send 400 rest,
 * filled once active).
 */
const meta = {
    title: 'Molecules/GlobalSearch',
    component: GlobalSearchBar,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof GlobalSearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const TEMPLATE_NAMES = [
    'Greeting text Eng',
    'Carrier invite text only for northern German region',
    'Test invitation template',
];

/**
 * Split-button behavior per the Figma annotations: picking a menu entry becomes
 * the new main-segment state — the chosen template name (truncated when long)
 * on the template button, the chosen send mode ("Direkt Versenden" vs
 * "Empfänger nur anlegen") persisted on the send button.
 */
const ComposerActions = ({ ready }: { ready: boolean }) => {
    const [template, setTemplate] = useState(TEMPLATE_NAMES[0]);
    const [sendMode, setSendMode] = useState<'direct' | 'createOnly'>('direct');

    return (
        <>
            <SplitButton
                icon={<MailFilledIcon />}
                label={template}
                menuLabel="E-Mail-Vorlage wählen"
                variant="outlined"
                menu={{
                    items: [
                        {
                            key: 'templates',
                            type: 'group',
                            label: 'E-Mail-Vorlagen auswählen oder erstellen',
                            children: TEMPLATE_NAMES.map((name) => ({ key: name, label: name })),
                        },
                        { key: 'divider', type: 'divider' },
                        { key: 'create', label: 'Neue E-Mail-Vorlage erstellen' },
                        { key: 'delete', label: 'E-Mail-Vorlage löschen' },
                    ],
                    selectable: true,
                    selectedKeys: [template],
                    onClick: ({ key }) => {
                        if (TEMPLATE_NAMES.includes(key)) setTemplate(key);
                    },
                }}
            />
            <SplitButton
                icon={ready ? <SendFilledIcon /> : <SendIcon />}
                label={sendMode === 'direct' ? 'Direkt Versenden' : 'Empfänger nur anlegen'}
                menuLabel="Sendeoptionen"
                variant={ready ? 'primary' : 'outlined'}
                menu={{
                    items: [
                        { key: 'direct', label: 'Direkt Versenden' },
                        { key: 'createOnly', label: 'Empfänger nur anlegen' },
                    ],
                    selectable: true,
                    selectedKeys: [sendMode],
                    onClick: ({ key }) => setSendMode(key as 'direct' | 'createOnly'),
                }}
            />
        </>
    );
};

const rowFields = (
    <>
        <FloatingLabelInput label="E-Mail" style={{ width: 304 }} />
        <FloatingLabelInput label="Vorname" style={{ width: 210 }} />
        <FloatingLabelInput label="Name" style={{ width: 210 }} />
        <ComposerActions ready={false} />
    </>
);

export const Minimized: Story = {
    args: {
        children: rowFields,
    },
};

export const ExpandedEmpty: Story = {
    args: {
        ...Minimized.args,
        defaultExpanded: true,
    },
};

export const Filled: Story = {
    args: {
        defaultExpanded: true,
        value: 'Konstanze',
        children: (
            <>
                <FloatingLabelInput defaultValue="Konstanze@Schanze.de" label="E-Mail" style={{ width: 304 }} />
                <FloatingLabelInput defaultValue="Konstanze" label="Vorname" style={{ width: 210 }} />
                <FloatingLabelInput defaultValue="Schanze" error label="Name" style={{ width: 210 }} />
                <ComposerActions ready />
            </>
        ),
    },
};

/** Narrow viewport: the row keeps its width and scrolls horizontally on a real, hoverable scrollbar. */
export const Overflow: Story = {
    args: {
        ...Minimized.args,
        defaultExpanded: true,
    },
    decorators: [
        (Story) => (
            <div style={{ width: 480, border: '1px dashed var(--m3-outline-variant, #c4c7c8)' }}>
                <Story />
            </div>
        ),
    ],
};

export const FloatingLabelStates: Story = {
    args: {},
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 304 }}>
            <FloatingLabelInput label="E-Mail (leer)" />
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <FloatingLabelInput autoFocus label="Vorname (Fokus)" />
            <FloatingLabelInput defaultValue="Konstanze@Schanze.de" label="E-Mail (gefüllt)" />
            <FloatingLabelInput
                defaultValue="Schanze"
                error
                label="Name (Fehler)"
                supportingText="Bitte gültigen Namen eingeben."
            />
            <FloatingLabelInput defaultValue="Deaktiviert" disabled label="Deaktiviert" />
        </div>
    ),
};

/**
 * Interactive split buttons: pick a template from the chevron menu and the main
 * segment takes over its (truncated) name; switch the send mode and it persists.
 */
export const SplitButtons: Story = {
    args: {},
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <ComposerActions ready={false} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <ComposerActions ready />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <SplitButton icon={<MailIcon />} label="Ohne Menü (nur Aktion)" variant="outlined" />
            </div>
        </div>
    ),
};

export const MenuOpen: Story = {
    args: {},
    render: () => (
        <div style={{ height: 320 }}>
            <GlobalSearchMenu
                menu={{
                    items: [
                        {
                            key: 'templates',
                            type: 'group',
                            label: 'E-Mail-Vorlagen auswählen oder erstellen',
                            children: TEMPLATE_NAMES.map((name) => ({ key: name, label: name })),
                        },
                        { key: 'divider', type: 'divider' },
                        { key: 'create', label: 'Neue E-Mail-Vorlage erstellen' },
                        { key: 'delete', label: 'E-Mail-Vorlage löschen' },
                    ],
                    selectedKeys: [TEMPLATE_NAMES[0]],
                }}
                open
            >
                <SplitButton icon={<MailFilledIcon />} label={TEMPLATE_NAMES[0]} variant="outlined" />
            </GlobalSearchMenu>
        </div>
    ),
};
