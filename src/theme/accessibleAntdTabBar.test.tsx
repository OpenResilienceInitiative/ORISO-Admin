import { fireEvent, render, screen } from '@testing-library/react';
import { Tabs } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { applyTabListBoundary, renderAccessibleAntdTabBar } from './accessibleAntdTabBar';

const items = [
    { key: 'a', label: 'First', children: 'First panel' },
    { key: 'b', label: 'Second', children: 'Second panel' },
];

describe('AntD tablist semantic boundary', () => {
    it('puts the real tablist around tabs while keeping overflow operations outside', () => {
        const { container, unmount } = render(<Tabs items={items} renderTabBar={renderAccessibleAntdTabBar} />);
        const list = screen.getByRole('tablist');
        expect(list).toHaveClass('ant-tabs-nav-list');
        expect(list).toHaveAttribute('aria-orientation', 'horizontal');
        expect(list.querySelectorAll('[role="tab"]')).toHaveLength(2);
        const more = container.querySelector('.ant-tabs-nav-more');
        expect(more).not.toBeNull();
        expect(list.contains(more)).toBe(false);
        expect(container.querySelector('.ant-tabs-nav')).not.toHaveAttribute('role');
        const retainedList = list;
        unmount();
        expect(retainedList).not.toHaveAttribute('role');
    });

    it('does not alter editable add/remove behavior or pretend that mode is supported', () => {
        const onEdit = vi.fn();
        const { container } = render(
            <Tabs type="editable-card" items={items} onEdit={onEdit} renderTabBar={renderAccessibleAntdTabBar} />,
        );
        expect(screen.getByRole('tablist')).toHaveClass('ant-tabs-nav');
        fireEvent.click(container.querySelector('.ant-tabs-nav-add')!);
        expect(onEdit).toHaveBeenLastCalledWith(expect.anything(), 'add');
        fireEvent.click(container.querySelector('.ant-tabs-tab-remove')!);
        expect(onEdit).toHaveBeenLastCalledWith('a', 'remove');
    });

    it('leaves an unknown library structure unchanged', () => {
        const root = document.createElement('div');
        root.innerHTML =
            '<div class="ant-tabs-nav" role="tablist"><div class="new-library-shape" role="tab">First</div></div>';
        const original = root.innerHTML;
        expect(applyTabListBoundary(root)).toBeUndefined();
        expect(root.innerHTML).toBe(original);
    });
});
