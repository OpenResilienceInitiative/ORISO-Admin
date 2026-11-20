import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { EditorHintSnackbar } from './EditorHintSnackbar';
import { EditorSnackbarQueue } from './EditorSnackbarQueue';

const Example = () => {
    const [visible, setVisible] = useState(['template', 'error', 'success']);
    return (
        <EditorSnackbarQueue
            items={visible.map((key) => ({
                key,
                node: (
                    <div role="status">
                        {key}
                        <button
                            type="button"
                            onClick={() => setVisible((items) => items.filter((item) => item !== key))}
                        >
                            Close {key}
                        </button>
                    </div>
                ),
            }))}
        />
    );
};

describe('EditorSnackbarQueue', () => {
    it('renders every item node as is, without a wrapper, and keeps the others after one is removed', async () => {
        render(<Example />);
        expect(screen.getAllByRole('status').map((element) => element.textContent)).toEqual([
            'templateClose template',
            'errorClose error',
            'successClose success',
        ]);
        await userEvent.click(screen.getByRole('button', { name: 'Close success' }));
        expect(screen.getAllByRole('status')).toHaveLength(2);
        expect(screen.getByText('template')).toBeInTheDocument();
        expect(screen.getByText('error')).toBeInTheDocument();
    });

    it('raises each item as a pop-up on the shared channel: the first shows with its actions, the next follows when one is used', async () => {
        const onPreview = vi.fn();
        const LongNotices = () => {
            const [showTemplate, setShowTemplate] = useState(true);
            const [showSuccess, setShowSuccess] = useState(true);
            return (
                <EditorSnackbarQueue
                    items={[
                        showTemplate && {
                            key: 'template',
                            node: (
                                <EditorHintSnackbar
                                    layout="long"
                                    text="Neue Vorlage verfügbar"
                                    onClose={() => setShowTemplate(false)}
                                    actionLabel="Nicht mehr anzeigen"
                                    onDismiss={() => undefined}
                                    secondaryAction={{ label: 'Vergleichsansicht öffnen', onClick: onPreview }}
                                />
                            ),
                        },
                        showSuccess && {
                            key: 'success',
                            node: (
                                <EditorHintSnackbar
                                    layout="long"
                                    tone="success"
                                    text="Gespeichert"
                                    onClose={() => setShowSuccess(false)}
                                    closeLabel="Erfolgshinweis schließen"
                                />
                            ),
                        },
                    ]}
                />
            );
        };
        const { container } = render(<LongNotices />);

        // The queue itself renders nothing in the layout; the pop-up is on the shared channel.
        // Only hidden owner markers (jump targets) stay in the page.
        expect(container.querySelectorAll(':scope > :not([hidden])')).toHaveLength(0);
        expect(await screen.findByText('Neue Vorlage verfügbar')).toBeInTheDocument();
        // Pop-ups stack: the success notice shows next to the template notice.
        expect(screen.getByText('Gespeichert')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Vergleichsansicht öffnen' }));
        expect(onPreview).toHaveBeenCalledOnce();
        // Using an action closes that pop-up; the other one stays.
        expect(screen.queryByText('Neue Vorlage verfügbar')).not.toBeInTheDocument();
        expect(screen.getByText('Gespeichert')).toBeInTheDocument();
    });

    it('keeps the other pop-up when the person closes one', async () => {
        const Notices = () => {
            const [showTemplate, setShowTemplate] = useState(true);
            return (
                <EditorSnackbarQueue
                    items={[
                        showTemplate && {
                            key: 'template',
                            node: (
                                <EditorHintSnackbar
                                    text="Neue Vorlage verfügbar"
                                    onClose={() => setShowTemplate(false)}
                                />
                            ),
                        },
                        {
                            key: 'success',
                            node: <EditorHintSnackbar tone="success" text="Gespeichert" onClose={() => undefined} />,
                        },
                    ]}
                />
            );
        };
        render(<Notices />);

        expect(await screen.findByText('Neue Vorlage verfügbar')).toBeInTheDocument();
        expect(screen.getByText('Gespeichert')).toBeInTheDocument();
        const template = screen.getByText('Neue Vorlage verfügbar').closest('[data-testid="snackbar"]') as HTMLElement;
        await userEvent.click(within(template).getByRole('button', { name: 'snackbar.close' }));

        expect(screen.queryByText('Neue Vorlage verfügbar')).not.toBeInTheDocument();
        expect(screen.getByText('Gespeichert')).toBeInTheDocument();
    });
});
