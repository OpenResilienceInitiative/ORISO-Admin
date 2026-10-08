import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import i18n from 'i18next';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { NoTopicConfirmModal } from './index';

/** Opens the dialog over a stand-in Save button so Cancel can hand focus back to it. */
const Harness = ({ language, saveLabel }: { language: string; saveLabel: string }) => {
    const saveRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(true);

    useEffect(() => {
        const previous = i18n.language;
        i18n.changeLanguage(language);
        return () => {
            i18n.changeLanguage(previous);
        };
    }, [language]);

    return (
        <div style={{ padding: 24 }}>
            <button ref={saveRef} type="button" onClick={() => setOpen(true)}>
                {saveLabel}
            </button>
            {open && (
                <NoTopicConfirmModal
                    onConfirm={() => setOpen(false)}
                    onClose={() => {
                        setOpen(false);
                        requestAnimationFrame(() => saveRef.current?.focus());
                    }}
                />
            )}
        </div>
    );
};

const meta = {
    title: 'Organisms/Agency/NoTopicConfirmModal',
    component: NoTopicConfirmModal,
    parameters: { layout: 'fullscreen' },
    args: {
        onConfirm: () => {},
        onClose: () => {},
    },
} satisfies Meta<typeof NoTopicConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const German: Story = {
    render: () => <Harness language="de" saveLabel="Speichern" />,
};

export const English: Story = {
    render: () => <Harness language="en" saveLabel="Save" />,
};

export const CancelReturnsFocus: Story = {
    render: () => <Harness language="de" saveLabel="Speichern" />,
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const dialog = await body.findByRole('dialog');
        await expect(within(dialog).getByText('Kein Thema ausgewählt')).toBeInTheDocument();
        await userEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));
        await waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument());
        await waitFor(() => expect(body.getByRole('button', { name: 'Speichern' })).toHaveFocus());
    },
};
