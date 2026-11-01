/** Restore an adapter's attributes without overwriting a later owner's changes. */
export const ownDomAttributes = (element: HTMLElement, attributes: Record<string, string | null>) => {
    const original = Object.fromEntries(Object.keys(attributes).map((name) => [name, element.getAttribute(name)]));
    Object.entries(attributes).forEach(([name, value]) => {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
    });
    return () => {
        Object.entries(attributes).forEach(([name, value]) => {
            if (element.getAttribute(name) !== value) return;
            if (original[name] === null) element.removeAttribute(name);
            else element.setAttribute(name, original[name]);
        });
    };
};
