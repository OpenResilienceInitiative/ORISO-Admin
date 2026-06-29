import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchInput from './SearchInput';

const t = (key: string, fallback?: string) =>
    ({
        'search-placeholder': 'Search',
        'searchInput.clear': 'Clear search',
        'searchInput.submit': 'Run search',
    }[key] ||
        fallback ||
        key);

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

describe('SearchInput', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('runs a debounced search after the minimum length is reached', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const handleOnSearch = vi.fn();

        render(<SearchInput handleOnSearch={handleOnSearch} minSearchLength={3} />);

        await user.type(screen.getByRole('textbox'), 'ab');
        vi.advanceTimersByTime(1000);
        expect(handleOnSearch).not.toHaveBeenCalled();

        await user.type(screen.getByRole('textbox'), 'c');
        vi.advanceTimersByTime(1000);
        expect(handleOnSearch).toHaveBeenCalledWith('abc');
    });

    it('runs an immediate search when Enter is pressed', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const handleOnSearch = vi.fn();

        render(<SearchInput handleOnSearch={handleOnSearch} searchOnChange={false} />);

        await user.type(screen.getByRole('textbox'), 'tenant{Enter}');

        expect(handleOnSearch).toHaveBeenCalledWith('tenant');
    });

    it('clears the value and notifies when the clear button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const handleOnSearchClear = vi.fn();
        const onValueChange = vi.fn();

        render(<SearchInput handleOnSearchClear={handleOnSearchClear} onValueChange={onValueChange} />);

        await user.type(screen.getByRole('textbox'), 'agency');
        await user.click(screen.getByRole('button', { name: 'Clear search' }));

        expect(screen.getByRole('textbox')).toHaveValue('');
        expect(onValueChange).toHaveBeenLastCalledWith('');
        expect(handleOnSearchClear).toHaveBeenCalledTimes(1);
    });
});
