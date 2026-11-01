import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccessibleLanguagePopup, applyLanguagePopupBoundary } from './AccessibleLanguagePopup';

const menu = (
    <div className="rc-virtual-list">
        <div className="rc-virtual-list-holder">
            <div className="rc-virtual-list-holder-inner" role="listbox" id="language-list">
                <div role="option" id="language-en" aria-selected="true">
                    English
                </div>
            </div>
        </div>
    </div>
);

describe('owned language combobox popup boundary', () => {
    it('moves the existing controlled id/listbox onto the actual holder without changing focus or options', () => {
        const { container, unmount } = render(
            <>
                <input
                    role="combobox"
                    aria-expanded="true"
                    aria-controls="language-list"
                    aria-activedescendant="language-en"
                />
                <AccessibleLanguagePopup menu={menu} label="Available languages" />
            </>,
        );
        const combo = container.querySelector('input')!;
        combo.focus();
        const holder = container.querySelector('.rc-virtual-list-holder')!;
        const inner = container.querySelector('.rc-virtual-list-holder-inner')!;
        expect(document.getElementById('language-list')).toBe(holder);
        expect(holder).toHaveAttribute('role', 'listbox');
        expect(holder).toHaveAttribute('aria-label', 'Available languages');
        expect(holder).not.toHaveAttribute('tabindex');
        expect(inner).not.toHaveAttribute('role');
        expect(inner).not.toHaveAttribute('id');
        expect(container.querySelectorAll('#language-list')).toHaveLength(1);
        expect(holder.querySelectorAll('[role="option"]')).toHaveLength(1);
        expect(document.getElementById(combo.getAttribute('aria-activedescendant')!)).toHaveTextContent('English');
        expect(combo).toHaveFocus();
        unmount();
        expect(holder).not.toHaveAttribute('role');
        expect(inner).toHaveAttribute('id', 'language-list');
        expect(inner).toHaveAttribute('role', 'listbox');
    });

    it('updates the owned accessible name and releases only its own values', () => {
        const { container, rerender, unmount } = render(
            <>
                <input role="combobox" aria-expanded="true" aria-controls="language-list" />
                <AccessibleLanguagePopup menu={menu} label="Sprachen" />
            </>,
        );
        rerender(
            <>
                <input role="combobox" aria-expanded="true" aria-controls="language-list" />
                <AccessibleLanguagePopup menu={menu} label="Languages" />
            </>,
        );
        const holder = container.querySelector('.rc-virtual-list-holder')!;
        expect(holder).toHaveAttribute('aria-label', 'Languages');
        act(() => holder.setAttribute('aria-label', 'Later owner'));
        unmount();
        expect(holder).toHaveAttribute('aria-label', 'Later owner');
    });

    it('releases hidden popup attributes and reapplies them on reopen', async () => {
        const { container } = render(
            <>
                <input role="combobox" aria-expanded="true" aria-controls="language-list" />
                <div className="ant-select-dropdown">
                    <AccessibleLanguagePopup menu={menu} label="Languages" />
                </div>
            </>,
        );
        const popup = container.querySelector('.ant-select-dropdown')!;
        const holder = container.querySelector('.rc-virtual-list-holder')!;
        const inner = container.querySelector('.rc-virtual-list-holder-inner')!;
        act(() => popup.classList.add('ant-select-dropdown-hidden'));
        await waitFor(() => expect(inner).toHaveAttribute('id', 'language-list'));
        expect(holder).not.toHaveAttribute('role');
        act(() => popup.classList.remove('ant-select-dropdown-hidden'));
        await waitFor(() => expect(holder).toHaveAttribute('id', 'language-list'));
        expect(inner).not.toHaveAttribute('role');
    });

    it('refuses an uncontrolled or changed library structure without changing its attributes', () => {
        const root = document.createElement('div');
        root.innerHTML =
            '<div class="rc-virtual-list"><div class="rc-virtual-list-holder"><div class="rc-virtual-list-holder-inner" role="listbox" id="uncontrolled"><div role="option">English</div></div></div></div>';
        const original = root.innerHTML;
        expect(applyLanguagePopupBoundary(root, 'Languages')).toBeUndefined();
        expect(root.innerHTML).toBe(original);
    });
});
