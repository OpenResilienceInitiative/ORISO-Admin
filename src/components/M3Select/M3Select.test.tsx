import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { M3Select } from './index';

const options = [{ value: 'de', label: 'Deutsch' }];

describe('M3Select', () => {
    it('uses the decorative ORISO chevron and keeps selecting with the keyboard', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const { container } = render(<M3Select aria-label="Language" options={options} onChange={onChange} />);
        const arrow = container.querySelector('.ant-select-arrow .anticon');
        expect(arrow).toHaveAttribute('aria-hidden', 'true');
        expect(arrow?.querySelector('path')).toHaveAttribute(
            'd',
            'M12 15.4L6 9.4L7.4 8L12 12.6L16.6 8L18 9.4L12 15.4Z',
        );

        await user.tab();
        expect(screen.getByRole('combobox', { name: 'Language' })).toHaveFocus();
        await user.keyboard('{Enter}');
        expect(screen.getByRole('combobox', { name: 'Language' })).toHaveAttribute('aria-expanded', 'true');
        await user.click(await screen.findByTitle('Deutsch'));
        expect(onChange).toHaveBeenCalledWith('de', options[0]);
    });

    it('keeps the spinner while loading and respects an explicit hidden chevron when ready', () => {
        const { container, rerender } = render(<M3Select options={options} loading suffixIcon={null} />);
        expect(container.querySelector('.ant-select-arrow-loading .anticon-loading')).toBeInTheDocument();

        rerender(<M3Select options={options} suffixIcon={null} />);
        expect(container.querySelector('.ant-select-arrow')).not.toBeInTheDocument();
    });
});
