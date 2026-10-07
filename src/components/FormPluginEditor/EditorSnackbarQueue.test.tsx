import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
    it('shows every notice in one editor stack and keeps the others after closing the bottom one', async () => {
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

    it('keeps the long template action available when a lower notice closes', async () => {
        const onPreview = vi.fn();
        const LongNotices = () => {
            const [showSuccess, setShowSuccess] = useState(true);
            return (
                <EditorSnackbarQueue
                    items={[
                        {
                            key: 'template',
                            node: (
                                <EditorHintSnackbar
                                    layout="long"
                                    text="Neue Vorlage verfügbar"
                                    onClose={() => undefined}
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
        render(<LongNotices />);

        await userEvent.click(screen.getByRole('button', { name: 'Erfolgshinweis schließen' }));
        expect(screen.queryByText('Gespeichert')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Vergleichsansicht öffnen' }));
        expect(onPreview).toHaveBeenCalledOnce();
        expect(screen.getByText('Neue Vorlage verfügbar')).toBeInTheDocument();
    });
    it('animates remaining notices down when the bottom notice leaves the anchored stack', async () => {
        const animate = vi.fn();
        const oldAnimate = HTMLElement.prototype.animate;
        Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
        const bounds = vi
            .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
            .mockImplementation(function noticeBounds() {
                const key = this.dataset.snackbarKey;
                const hasBottom = this.parentElement?.querySelector('[data-snackbar-key="success"]');
                let top = 100;
                if (key === 'template') top = hasBottom ? 10 : 50;
                return {
                    top,
                    bottom: top + 40,
                    left: 0,
                    right: 300,
                    width: 300,
                    height: 40,
                    x: 0,
                    y: top,
                    toJSON: () => ({}),
                };
            });
        try {
            render(<Example />);
            await userEvent.click(screen.getByRole('button', { name: 'Close success' }));
            expect(animate).toHaveBeenCalledWith([{ transform: 'translateY(-40px)' }, { transform: 'translateY(0)' }], {
                duration: 220,
                easing: 'cubic-bezier(0.2, 0, 0, 1)',
            });
        } finally {
            bounds.mockRestore();
            Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: oldAnimate });
        }
    });
});
