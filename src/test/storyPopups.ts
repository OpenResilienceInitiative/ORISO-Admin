// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export, invisible to the eslint import resolver
import { waitFor, within } from 'storybook/test';

/**
 * Helpers for `play` functions: pop-ups live in the app-level snackbar host, which sits outside the
 * story's canvas element, so they are found from the document body.
 */
export const popupsOf = (canvasElement: HTMLElement): HTMLElement[] =>
    within(canvasElement.ownerDocument.body).queryAllByTestId('snackbar');

/** Waits for a pop-up whose text matches; returns it. Optional severity narrows the match. */
export const findPopup = async (
    canvasElement: HTMLElement,
    text: RegExp | string,
    severity?: 'error' | 'warning' | 'info' | 'success',
): Promise<HTMLElement> => {
    let found: HTMLElement | undefined;
    await waitFor(
        () => {
            found = popupsOf(canvasElement).find(
                (popup) =>
                    (typeof text === 'string'
                        ? popup.textContent?.includes(text)
                        : text.test(popup.textContent ?? '')) &&
                    (!severity || popup.getAttribute('data-severity') === severity),
            );
            if (!found) throw new Error(`No pop-up with text ${String(text)}${severity ? ` (${severity})` : ''}`);
        },
        { timeout: 8000 },
    );
    return found as HTMLElement;
};
