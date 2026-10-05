import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OpenDepartmentFieldOnRequest } from './OpenDepartmentFieldOnRequest';

describe('OpenDepartmentFieldOnRequest (#1069)', () => {
    it('does nothing until a jump is requested', () => {
        const startEditing = vi.fn();
        const form = { scrollToField: vi.fn() };

        render(<OpenDepartmentFieldOnRequest request={0} startEditing={startEditing} form={form} />);

        expect(startEditing).not.toHaveBeenCalled();
    });

    it('opens the settings card and moves to the Fachbereich field on every request', async () => {
        vi.useFakeTimers();
        const startEditing = vi.fn();
        const form = { scrollToField: vi.fn() };

        const { rerender } = render(
            <OpenDepartmentFieldOnRequest request={1} startEditing={startEditing} form={form} />,
        );
        vi.runAllTimers();

        expect(startEditing).toHaveBeenCalledTimes(1);
        expect(form.scrollToField).toHaveBeenCalledWith('topicIds', expect.objectContaining({ focus: true }));

        rerender(<OpenDepartmentFieldOnRequest request={2} startEditing={startEditing} form={form} />);
        vi.runAllTimers();

        expect(startEditing).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });
});
