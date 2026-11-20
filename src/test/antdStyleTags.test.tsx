// Guards the antd setting in ./setup.ts. jsdom matches every CSS rule in <head> against an element
// and all its ancestors on each computed-style lookup (what role queries do), so antd's 800+ rules
// per test file made single findByRole calls take seconds.
import { Button } from 'antd';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';

describe('antd styles in jsdom', () => {
    it('renders antd components with their class names but injects no antd CSS into <head>', () => {
        render(<Button type="primary">Save</Button>);

        expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('ant-btn', 'ant-btn-primary');
        expect(document.head.querySelectorAll('style[data-css-hash]')).toHaveLength(0);
    });
});
