import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FloatingLabelSelect } from './index';
import {
    AccessibleVirtualSelectPopup,
    applyRequiredComboboxBoundary,
    applyVirtualOptionBoundary,
} from './selectAriaBoundary';

describe('select semantic state boundaries', () => {
    it('retains required on the named combobox and removes only its generic-shell duplicate', async () => {
        const { container } = render(
            <FloatingLabelSelect label="Topics" aria-required="true" options={[{ value: 'a', label: 'Alpha' }]} />,
        );
        const combo = screen.getByRole('combobox', { name: 'Topics' });
        expect(combo).toHaveAttribute('aria-required', 'true');
        await waitFor(() => expect(container.querySelector('.ant-select')).not.toHaveAttribute('aria-required'));
    });

    it('refuses required cleanup when actual widget state differs', () => {
        const root = document.createElement('div');
        root.innerHTML =
            '<div class="ant-select" aria-required="true"><input role="combobox" aria-required="false"></div>';
        expect(applyRequiredComboboxBoundary(root)).toBeUndefined();
        expect(root.firstElementChild).toHaveAttribute('aria-required', 'true');
    });

    it('preserves virtual listbox/options/active-descendant and painted selection while releasing only invalid duplicate state', () => {
        const root = document.createElement('div');
        root.innerHTML =
            '<input role="combobox" aria-controls="topics-list" aria-activedescendant="topic-a"><div role="listbox" id="topics-list"><div role="option" id="topic-a" aria-selected="true">Alpha</div></div><div class="rc-virtual-list-holder"><div class="ant-select-item-option ant-select-item-option-selected" aria-selected="true">Alpha</div><div class="ant-select-item-option" aria-selected="false">Beta</div></div>';
        document.body.append(root);
        try {
            const proxy = root.querySelector('[role="listbox"]')!;
            const before = proxy.outerHTML;
            const row = root.querySelector('.ant-select-item-option')!;
            const release = applyVirtualOptionBoundary(root)!;
            expect(proxy.outerHTML).toBe(before);
            expect(root.querySelector('input')).toHaveAttribute('aria-activedescendant', 'topic-a');
            expect(row).toHaveClass('ant-select-item-option-selected');
            expect(row).not.toHaveAttribute('aria-selected');
            expect(root.querySelectorAll('.ant-select-item-option[aria-selected]')).toHaveLength(0);
            release();
            expect(row).toHaveAttribute('aria-selected', 'true');
            expect(proxy.outerHTML).toBe(before);
        } finally {
            root.remove();
        }
    });

    it('tracks real selection updates without changing proxy state and releases painted state on unmount', async () => {
        const menu = (selected: boolean) => (
            <>
                <div role="listbox" id="live-topics">
                    <div role="option" aria-selected={selected} id="live-topic">
                        Alpha
                    </div>
                </div>
                <div className="rc-virtual-list-holder">
                    <div className="ant-select-item-option" aria-selected={selected}>
                        Alpha
                    </div>
                </div>
            </>
        );
        const fixture = (selected: boolean) => (
            <>
                <input
                    role="combobox"
                    aria-expanded="true"
                    aria-controls="live-topics"
                    aria-activedescendant="live-topic"
                />
                <AccessibleVirtualSelectPopup menu={menu(selected)} />
            </>
        );
        const { container, rerender, unmount } = render(fixture(false));
        const row = container.querySelector('.ant-select-item-option')!;
        expect(row).not.toHaveAttribute('aria-selected');
        rerender(fixture(true));
        await waitFor(() => expect(row).not.toHaveAttribute('aria-selected'));
        expect(container.querySelector('[role="option"]')).toHaveAttribute('aria-selected', 'true');
        unmount();
        expect(row).toHaveAttribute('aria-selected', 'true');
    });

    it('leaves unknown/nonvirtual structures unchanged', () => {
        const root = document.createElement('div');
        root.innerHTML =
            '<div class="rc-virtual-list-holder"><div class="ant-select-item-option" aria-selected="true">Alpha</div></div>';
        const before = root.innerHTML;
        expect(applyVirtualOptionBoundary(root)).toBeUndefined();
        expect(root.innerHTML).toBe(before);
    });
});
