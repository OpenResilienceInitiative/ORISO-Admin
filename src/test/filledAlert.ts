import { screen, waitFor } from '@testing-library/react';

/**
 * `role="alert"` elements that carry a message. The app-level pop-up host keeps an empty `alert` live
 * region mounted (that is what lets screen readers announce a later pop-up), so a bare
 * `findByRole('alert')` is ambiguous in a test that has seen any notification.
 */
export const filledAlerts = (): HTMLElement[] =>
    screen.queryAllByRole('alert').filter((node) => (node.textContent ?? '').trim() !== '');

export const findFilledAlert = (): Promise<HTMLElement> =>
    waitFor(() => {
        const [first] = filledAlerts();
        if (!first) throw new Error('No alert with a message is shown');
        return first;
    });
