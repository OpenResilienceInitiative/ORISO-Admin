/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- fixtures: a tooltip on non-interactive text is exactly what is under test */
import React from 'react';
import { describe, expect, it } from 'vite-plus/test';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { M3Tooltip } from './index';

describe('M3Tooltip', () => {
    it('shows the explanation on hover and hides it again on leave', async () => {
        const user = userEvent.setup();
        render(
            <M3Tooltip text="Durch ein erneutes Versenden ersetzt.">
                <span tabIndex={0}>Ersetzt</span>
            </M3Tooltip>,
        );

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        await user.hover(screen.getByText('Ersetzt'));
        expect(await screen.findByRole('tooltip')).toHaveTextContent('Durch ein erneutes Versenden ersetzt.');

        await user.unhover(screen.getByText('Ersetzt'));
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('shows a name-only tooltip without repeating it as the description', async () => {
        const user = userEvent.setup();
        render(
            <M3Tooltip nameOnly text="Einladungslink kopieren">
                <button type="button" aria-label="Einladungslink kopieren" />
            </M3Tooltip>,
        );

        await user.tab();
        expect(await screen.findByRole('tooltip')).toHaveTextContent('Einladungslink kopieren');
        expect(screen.getByRole('button', { name: 'Einladungslink kopieren' })).not.toHaveAttribute('aria-describedby');
    });

    it('opens on keyboard focus and describes the trigger', async () => {
        const user = userEvent.setup();
        render(
            <M3Tooltip text="Noch nicht versendet.">
                <button type="button">Draft</button>
            </M3Tooltip>,
        );

        await user.tab();
        const trigger = screen.getByRole('button', { name: 'Draft' });
        expect(trigger).toHaveFocus();
        expect(await screen.findByRole('tooltip')).toBeInTheDocument();
        // The description is what a screen reader announces with the trigger —
        // the visible bubble alone would leave it out.
        expect(trigger).toHaveAccessibleDescription('Noch nicht versendet.');
    });

    // WCAG 2.2 SC 1.4.13: content on hover/focus must be dismissible without
    // moving the pointer or losing focus.
    it('dismisses on Escape while the trigger keeps focus', async () => {
        const user = userEvent.setup();
        render(
            <M3Tooltip text="Noch nicht versendet.">
                <button type="button">Draft</button>
            </M3Tooltip>,
        );

        await user.tab();
        expect(await screen.findByRole('tooltip')).toBeInTheDocument();

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Draft' })).toHaveFocus();
    });

    it('renders nothing extra when there is no text to explain', async () => {
        const user = userEvent.setup();
        render(
            <M3Tooltip text="">
                <span tabIndex={0}>Ersetzt</span>
            </M3Tooltip>,
        );

        await user.hover(screen.getByText('Ersetzt'));
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        expect(screen.getByText('Ersetzt')).not.toHaveAttribute('aria-describedby');
    });

    // A portal bubble sits at fixed coordinates, so it must follow its trigger when the row scrolls.
    it('moves a portal bubble with its trigger on scroll, and stops listening once closed', async () => {
        const user = userEvent.setup();
        render(
            <M3Tooltip portal placement="bottom" text="Nr. 42 ist vergeben.">
                <button type="button">42</button>
            </M3Tooltip>,
        );
        const wrapper = screen.getByRole('button', { name: '42' }).parentElement as HTMLElement;
        let left = 100;
        wrapper.getBoundingClientRect = () => ({ left, width: 20, top: 10, bottom: 30 } as DOMRect);

        await user.hover(wrapper);
        expect(await screen.findByRole('tooltip')).toHaveStyle({ left: '110px', top: '34px' });

        left = 200;
        fireEvent.scroll(window);
        expect(screen.getByRole('tooltip')).toHaveStyle({ left: '210px' });

        await user.unhover(wrapper);
        left = 300;
        fireEvent.scroll(window);
        await user.hover(wrapper);
        expect(await screen.findByRole('tooltip')).toHaveStyle({ left: '310px' });
    });

    // Portal mode exists for scrolling rows: a scroll inside one, not only on window, must move the bubble.
    it('follows its trigger when a containing row scrolls', async () => {
        const user = userEvent.setup();
        render(
            <div data-testid="row" style={{ overflowX: 'auto' }}>
                <M3Tooltip portal placement="bottom" text="Nr. 42 ist vergeben.">
                    <button type="button">42</button>
                </M3Tooltip>
            </div>,
        );
        const wrapper = screen.getByRole('button', { name: '42' }).parentElement as HTMLElement;
        let left = 100;
        wrapper.getBoundingClientRect = () => ({ left, width: 20, top: 10, bottom: 30 } as DOMRect);
        await user.hover(wrapper);
        expect(await screen.findByRole('tooltip')).toHaveStyle({ left: '110px' });

        left = 60;
        fireEvent.scroll(screen.getByTestId('row'));

        expect(screen.getByRole('tooltip')).toHaveStyle({ left: '70px' });
    });

    // At a narrow viewport or high zoom the bubble may not be wider than the space between both edges.
    it('caps a portal bubble to the viewport width so long text wraps inside it', async () => {
        const originalWidth = window.innerWidth;
        window.innerWidth = 200;
        try {
            const user = userEvent.setup();
            render(
                <M3Tooltip portal text="Nur Plattform-Admins können geteilte Vorlagen ändern.">
                    <button type="button">Bearbeiten</button>
                </M3Tooltip>,
            );
            await user.hover(screen.getByRole('button', { name: 'Bearbeiten' }));

            expect(await screen.findByRole('tooltip')).toHaveStyle({ maxWidth: '184px', boxSizing: 'border-box' });
        } finally {
            window.innerWidth = originalWidth;
        }
    });

    // A text that comes and goes must not remount the trigger: a focused one would lose keyboard focus.
    it('keeps the same trigger, and its focus, when the text becomes empty with keepWrapper', async () => {
        const user = userEvent.setup();
        const tree = (text: string) => (
            <M3Tooltip keepWrapper text={text}>
                <button type="button">Zurück</button>
            </M3Tooltip>
        );
        const { rerender } = render(tree('Zurück zu Träger'));
        await user.tab();
        const trigger = screen.getByRole('button', { name: 'Zurück' });
        expect(trigger).toHaveFocus();

        rerender(tree(''));

        expect(screen.getByRole('button', { name: 'Zurück' })).toBe(trigger);
        expect(trigger).toHaveFocus();
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    // The tooltip clones its trigger; a description the trigger already carries must survive that.
    describe('a trigger that already has its own description', () => {
        const trigger = (props: { text: string; nameOnly?: boolean; keepWrapper?: boolean }) => (
            <>
                <span id="own-hint">Nur lesbar.</span>
                <M3Tooltip {...props}>
                    <button type="button" aria-describedby="own-hint">
                        Zurück
                    </button>
                </M3Tooltip>
            </>
        );

        it('keeps it while keepWrapper shows no bubble', () => {
            render(trigger({ text: '', keepWrapper: true }));

            expect(screen.getByRole('button', { name: 'Zurück' })).toHaveAccessibleDescription('Nur lesbar.');
        });

        it('adds the bubble to it instead of replacing it', async () => {
            const user = userEvent.setup();
            render(trigger({ text: 'Zurück zu Träger' }));

            await user.tab();
            expect(await screen.findByRole('tooltip')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Zurück' })).toHaveAccessibleDescription(
                'Nur lesbar. Zurück zu Träger',
            );
        });

        it('keeps it while a name-only bubble is shown', async () => {
            const user = userEvent.setup();
            render(trigger({ text: 'Zurück zu Träger', nameOnly: true }));

            await user.tab();
            expect(await screen.findByRole('tooltip')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Zurück' })).toHaveAccessibleDescription('Nur lesbar.');
        });
    });
});
