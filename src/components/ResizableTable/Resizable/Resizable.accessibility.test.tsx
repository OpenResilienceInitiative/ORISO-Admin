import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import ResizableTitle from './Resizable';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

const mount = (width: number) => {
    const onResize = vi.fn();
    const result = render(
        <table>
            <thead>
                <tr>
                    <ResizableTitle width={width} onResize={onResize}>
                        Name
                    </ResizableTitle>
                </tr>
            </thead>
        </table>,
    );
    return { ...result, onResize };
};

describe('Resizable column keyboard access', () => {
    it('exposes one column header and a named vertical splitter with valid ARIA', async () => {
        const { container } = mount(100);
        expect(screen.getAllByRole('columnheader')).toHaveLength(1);
        const handle = screen.getByRole('separator', { name: 'Spaltenbreite ändern' });
        expect(handle).toHaveAttribute('aria-orientation', 'vertical');
        expect(handle).toHaveAttribute('aria-valuenow', '100');
        const result = await axe.run(container, {
            runOnly: ['aria-required-parent', 'aria-required-children', 'aria-allowed-attr'],
        });
        expect(result.violations).toHaveLength(0);
    });

    it.each([
        ['ArrowLeft', 100, 90],
        ['ArrowRight', 100, 110],
        ['Home', 100, 50],
        ['End', 100, 500],
        ['ArrowLeft', 50, 50],
        ['ArrowRight', 500, 500],
    ])('supports %s at width %s within pointer-resize bounds', (key, width, expectedWidth) => {
        const { onResize } = mount(Number(width));
        const handle = screen.getByRole('separator', { name: 'Spaltenbreite ändern' });
        fireEvent.keyDown(handle, { key });
        expect(onResize).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ size: { width: expectedWidth, height: 0 }, handle: 'e' }),
        );
    });
});
