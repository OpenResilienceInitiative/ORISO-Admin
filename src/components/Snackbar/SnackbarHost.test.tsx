import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import '../../i18n';
import { SnackbarProvider, useSnackbar } from './useSnackbar';
import { createSnackbarApi, createSnackbarStore } from './snackbarStore';

const setup = () => {
    const store = createSnackbarStore();
    const api = createSnackbarApi(store);
    render(<SnackbarProvider store={store} />);
    return { store, api };
};

describe('SnackbarHost', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('announces a confirmation politely and an error assertively', () => {
        const { api } = setup();
        act(() => {
            api.success('Gespeichert');
            api.error('Fehler');
        });
        expect(within(screen.getByRole('status')).getByText('Gespeichert')).toBeInTheDocument();
        expect(within(screen.getByRole('alert')).queryByText('Gespeichert')).toBeNull();
        expect(within(screen.getByRole('alert')).getByText('Fehler')).toBeInTheDocument();
    });

    it('shows one snackbar for a burst of identical errors', () => {
        const { api } = setup();
        act(() => {
            for (let i = 0; i < 4; i += 1) api.error('Es ist ein Fehler aufgetreten.');
        });
        expect(screen.getAllByTestId('snackbar')).toHaveLength(1);
    });

    it('hides on its own after the Material 3 time', () => {
        const { api } = setup();
        act(() => {
            api.success('Gespeichert');
        });
        act(() => {
            vi.advanceTimersByTime(3900);
        });
        expect(screen.getByText('Gespeichert')).toBeInTheDocument();
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(screen.queryByText('Gespeichert')).toBeNull();
    });

    it.each(['error', 'warning'] as const)('keeps a %s until it is closed (K2, K3)', async (severity) => {
        const { api } = setup();
        act(() => {
            api.notify({ message: 'Bleibt', severity, durationMs: 4000 });
        });
        act(() => {
            vi.advanceTimersByTime(10 * 60_000);
        });
        expect(screen.getByText('Bleibt')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /Meldung schließen|Close message/ }));
        expect(screen.queryByText('Bleibt')).toBeNull();
    });

    it('keeps anything with an action until it is acted on or closed, errors included (K5)', async () => {
        const { api } = setup();
        const retry = vi.fn();
        act(() => {
            api.error({ message: 'Speichern fehlgeschlagen', action: { label: 'Erneut', onClick: retry } });
        });
        act(() => {
            vi.advanceTimersByTime(10 * 60_000);
        });
        expect(screen.getByText('Speichern fehlgeschlagen')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Erneut' }));
        expect(retry).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Speichern fehlgeschlagen')).toBeNull();
    });

    it.each([
        ['success', 4000],
        ['info', 4000],
    ] as const)('lets only a %s time out, after 4 to 6 seconds', (severity, ms) => {
        const { api } = setup();
        act(() => {
            api.notify({ message: 'Weg', severity });
        });
        act(() => {
            vi.advanceTimersByTime(ms - 100);
        });
        expect(screen.getByText('Weg')).toBeInTheDocument();
        act(() => {
            vi.advanceTimersByTime(2200);
        });
        expect(screen.queryByText('Weg')).toBeNull();
    });

    it.each(['success', 'info', 'warning', 'error'] as const)(
        'puts a close button on every %s (K4)',
        async (severity) => {
            const { api } = setup();
            act(() => {
                api.notify({ message: 'Hallo', severity });
            });
            await userEvent.click(screen.getByRole('button', { name: /Meldung schließen|Close message/ }));
            expect(screen.queryByText('Hallo')).toBeNull();
        },
    );

    it('pauses the timer while the pointer is over the snackbar', async () => {
        const { api } = setup();
        act(() => {
            api.success('Gespeichert');
        });
        await userEvent.hover(screen.getByText('Gespeichert'));
        act(() => {
            vi.advanceTimersByTime(30_000);
        });
        expect(screen.getByText('Gespeichert')).toBeInTheDocument();
        await userEvent.unhover(screen.getByText('Gespeichert'));
        act(() => {
            vi.advanceTimersByTime(4100);
        });
        expect(screen.queryByText('Gespeichert')).toBeNull();
    });

    it('runs the action and closes the snackbar', async () => {
        const { api } = setup();
        const undo = vi.fn();
        act(() => {
            api.notify({ message: 'Verworfen', action: { label: 'Rückgängig', onClick: undo } });
        });
        await userEvent.click(screen.getByRole('button', { name: 'Rückgängig' }));
        expect(undo).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Verworfen')).toBeNull();
    });

    it('offers a second action, keeps the snackbar until one of them is used, and takes a test id', async () => {
        const { api } = setup();
        const first = vi.fn();
        const second = vi.fn();
        act(() => {
            api.notify({
                message: 'Zwei Entwürfe',
                action: { label: 'Neuen behalten', onClick: first },
                secondaryAction: { label: 'Alten behalten', onClick: second },
                testId: 'draft-choice',
            });
        });
        act(() => {
            vi.advanceTimersByTime(10 * 60_000);
        });
        expect(screen.getByTestId('draft-choice')).toHaveAttribute('data-layout', 'stacked');
        await userEvent.click(screen.getByRole('button', { name: 'Alten behalten' }));
        expect(second).toHaveBeenCalledTimes(1);
        expect(first).not.toHaveBeenCalled();
        expect(screen.queryByTestId('draft-choice')).toBeNull();
    });

    it('closes on Escape when focus is inside, without taking focus by itself', async () => {
        const { api } = setup();
        act(() => {
            api.error('Fehler');
        });
        expect(document.body).toHaveFocus();
        await userEvent.tab();
        expect(screen.getByRole('button', { name: /Meldung schließen|Close message/ })).toHaveFocus();
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByText('Fehler')).toBeNull();
    });

    it('puts a long action label on its own row (Figma "longer action")', () => {
        const { api } = setup();
        act(() => {
            api.notify({ message: 'x', action: { label: 'Erneut versuchen', onClick: () => undefined } });
        });
        expect(screen.getByTestId('snackbar')).toHaveAttribute('data-layout', 'stacked');
    });

    it('useSnackbar raises through the store of its provider', () => {
        const store = createSnackbarStore();
        const Trigger = () => {
            const { success } = useSnackbar();
            return (
                <button type="button" onClick={() => success('Gespeichert')}>
                    go
                </button>
            );
        };
        render(
            <SnackbarProvider store={store}>
                <Trigger />
            </SnackbarProvider>,
        );
        act(() => {
            screen.getByRole('button', { name: 'go' }).click();
        });
        expect(store.getState().current?.message).toBe('Gespeichert');
    });

    describe('the stack', () => {
        it('shows up to four pop-ups at once, oldest on top, newest nearest the corner, and queues the rest', () => {
            const { api } = setup();
            act(() => {
                ['Eins', 'Zwei', 'Drei', 'Vier', 'Fünf'].forEach((text) => api.error(text));
            });
            const shown = screen.getAllByTestId('snackbar');
            expect(shown).toHaveLength(4);
            expect(shown.map((node) => node.textContent)).toEqual([
                expect.stringContaining('Eins'),
                expect.stringContaining('Zwei'),
                expect.stringContaining('Drei'),
                expect.stringContaining('Vier'),
            ]);
            expect(shown.map((node) => (node.parentElement as HTMLElement).style.order)).toEqual(['0', '1', '2', '3']);
            expect(screen.queryByText('Fünf')).toBeNull();
        });

        it('moves the waiting one up when a pop-up is closed', async () => {
            const { api } = setup();
            act(() => {
                ['Eins', 'Zwei', 'Drei', 'Vier', 'Fünf'].forEach((text) => api.error(text));
            });
            await userEvent.click(
                within(screen.getAllByTestId('snackbar')[0]).getByRole('button', { name: /schließen|Close/ }),
            );
            expect(screen.queryByText('Eins')).toBeNull();
            expect(screen.getByText('Fünf')).toBeInTheDocument();
            expect(screen.getAllByTestId('snackbar')).toHaveLength(4);
        });

        it('times out each success on its own while an error next to it stays', () => {
            const { api } = setup();
            act(() => {
                api.error('Bleibt');
                api.success('Geht');
            });
            act(() => {
                vi.advanceTimersByTime(7000);
            });
            expect(screen.queryByText('Geht')).toBeNull();
            expect(screen.getByText('Bleibt')).toBeInTheDocument();
        });

        it('shows a title in bold with the text under it', () => {
            const { api } = setup();
            act(() => {
                api.error({ title: 'Speichern fehlgeschlagen', description: 'Bitte erneut versuchen.' });
            });
            const popup = screen.getByTestId('snackbar');
            expect(within(popup).getByText('Speichern fehlgeschlagen')).toBeInTheDocument();
            expect(within(popup).getByText('Bitte erneut versuchen.')).toBeInTheDocument();
        });

        it('shows one pop-up for one cause, however many cards raise it (causeKey)', () => {
            const { api } = setup();
            act(() => {
                ['A', 'B', 'C', 'D', 'E', 'F'].forEach((card) =>
                    api.notify({ title: `${card} lädt nicht`, severity: 'error', causeKey: 'tenant-api-down' }),
                );
            });
            expect(screen.getAllByTestId('snackbar')).toHaveLength(1);
        });
    });

    describe('the jump action', () => {
        const mount = () => {
            const store = createSnackbarStore();
            const api = createSnackbarApi(store);
            const onJump = vi.fn();
            render(
                <SnackbarProvider store={store}>
                    <section id="tile-legal" tabIndex={-1}>
                        <h3>Rechtliches</h3>
                        <button type="button">Editor öffnen</button>
                    </section>
                </SnackbarProvider>,
            );
            return { api, store, onJump };
        };

        beforeEach(() => {
            window.HTMLElement.prototype.scrollIntoView = vi.fn();
        });

        it('offers "Ansehen", scrolls to the owner, focuses its first button and dismisses the pop-up', async () => {
            const { api } = mount();
            act(() => {
                api.error({ title: 'Entwurf fehlt', jump: { target: 'tile-legal' } });
            });
            await userEvent.click(screen.getByRole('button', { name: /Ansehen|View/ }));
            await act(async () => {
                vi.advanceTimersByTime(50);
            });
            const tile = document.getElementById('tile-legal') as HTMLElement;
            expect(tile.scrollIntoView).toHaveBeenCalled();
            expect(screen.getByRole('button', { name: 'Editor öffnen' })).toHaveFocus();
            expect(screen.queryByText('Entwurf fehlt')).toBeNull();
        });

        it('runs onJump first, so the owner can open before it is focused, and takes a custom label and a selector', async () => {
            const { api, onJump } = mount();
            act(() => {
                api.notify({
                    title: 'Hinweis',
                    severity: 'warning',
                    jump: { target: '#tile-legal h3', label: 'Öffnen', onJump },
                });
            });
            await userEvent.click(screen.getByRole('button', { name: 'Öffnen' }));
            await act(async () => {
                vi.advanceTimersByTime(50);
            });
            expect(onJump).toHaveBeenCalledTimes(1);
            expect(screen.getByRole('heading', { name: 'Rechtliches' })).toHaveFocus();
        });

        it('keeps the pop-up until the person acts, even for a success', () => {
            const { api } = mount();
            act(() => {
                api.success({ title: 'Gespeichert', jump: 'tile-legal' });
            });
            act(() => {
                vi.advanceTimersByTime(10 * 60_000);
            });
            expect(screen.getByText('Gespeichert')).toBeInTheDocument();
        });

        it('gives the explicit actions the buttons and puts the jump second when there is room', () => {
            const { api } = mount();
            act(() => {
                api.error({
                    title: 'Zwei Entwürfe',
                    action: { label: 'Neuen', onClick: () => undefined },
                    jump: 'tile-legal',
                });
            });
            expect(screen.getByRole('button', { name: /Ansehen|View/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Neuen' })).toBeInTheDocument();
        });

        it('does nothing, and does not throw, when the target is gone', async () => {
            const { api } = mount();
            act(() => {
                api.error({ title: 'Weg', jump: 'does-not-exist' });
            });
            await userEvent.click(screen.getByRole('button', { name: /Ansehen|View/ }));
            await act(async () => {
                vi.advanceTimersByTime(50);
            });
            expect(screen.queryByText('Weg')).toBeNull();
        });
    });
    describe('keyboard and pointer', () => {
        it('keeps waiting while focus is inside, even after the pointer leaves', async () => {
            const { api } = setup();
            act(() => {
                api.success('Gespeichert');
            });
            const close = screen.getByRole('button', { name: /Meldung schließen|Close message/ });
            const popup = screen.getByTestId('snackbar');
            await userEvent.hover(popup);
            act(() => {
                close.focus();
            });
            await userEvent.unhover(popup);
            act(() => {
                vi.advanceTimersByTime(60_000);
            });
            expect(screen.getByText('Gespeichert')).toBeInTheDocument();
        });

        it('gives focus back to where it was when the focused pop-up closes with Escape', async () => {
            const { api } = setup();
            const opener = document.createElement('button');
            document.body.appendChild(opener);
            opener.focus();
            act(() => {
                api.error('Fehler');
            });
            act(() => {
                screen.getByRole('button', { name: /Meldung schließen|Close message/ }).focus();
            });
            await userEvent.keyboard('{Escape}');
            expect(screen.queryByText('Fehler')).toBeNull();
            expect(opener).toHaveFocus();
            opener.remove();
        });

        it('keeps focus on the button when the same message is raised again', async () => {
            const { api } = setup();
            act(() => {
                api.error({ title: 'Fehler', key: 'save' });
            });
            const close = screen.getByRole('button', { name: /Meldung schließen|Close message/ });
            act(() => {
                close.focus();
            });
            act(() => {
                api.error({ title: 'Fehler', description: 'neu', key: 'save' });
            });
            expect(screen.getByRole('button', { name: /Meldung schließen|Close message/ })).toBe(close);
            expect(close).toHaveFocus();
        });

        it('reaches the newest pop-up with Alt+T from anywhere on the page', async () => {
            const { api } = setup();
            act(() => {
                api.error('Erster');
                api.error('Neuester');
            });
            await userEvent.keyboard('{Alt>}t{/Alt}');
            expect(within(screen.getAllByTestId('snackbar')[1]).getByRole('button')).toHaveFocus();
        });
    });

    it('shows a second action even without a first one', () => {
        const { api } = setup();
        act(() => {
            api.notify({ title: 'Zwei', secondaryAction: { label: 'Verwerfen', onClick: vi.fn() } });
        });
        expect(screen.getByRole('button', { name: 'Verwerfen' })).toBeInTheDocument();
        expect(screen.getByTestId('snackbar')).toHaveAttribute('data-layout', 'stacked');
    });
});
