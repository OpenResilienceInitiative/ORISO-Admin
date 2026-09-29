/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- fixtures: a tooltip on non-interactive text is exactly what is under test */
import React from 'react';
import { describe, expect, it } from 'vitest';
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
});
