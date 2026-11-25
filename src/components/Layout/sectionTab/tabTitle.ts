/**
 * Swaps the page title for the section name ("Konten", "Mein Account") and back. The default
 * (`index.html`'s title, or whatever a later writer sets) is remembered on the `<title>` element.
 * Nothing in the admin rewrites the title today; any future writer must go through
 * {@link applyDefaultTitle} so it cannot overwrite a section title that is showing.
 */

export const SECTION_TITLE_ATTR = 'data-section-title';
export const DEFAULT_TITLE_ATTR = 'data-default-title';

const titleNode = (): HTMLTitleElement => {
    let node = document.querySelector('title');
    if (!node) {
        node = document.createElement('title');
        document.head.appendChild(node);
    }
    return node;
};

export const showSectionTitle = (title: string): void => {
    const node = titleNode();
    if (!node.hasAttribute(SECTION_TITLE_ATTR)) {
        node.setAttribute(SECTION_TITLE_ATTR, '');
        node.setAttribute(DEFAULT_TITLE_ATTR, node.textContent ?? '');
    }
    node.textContent = title;
};

export const restoreDefaultTitle = (): void => {
    const node = document.querySelector('title');
    if (!node?.hasAttribute(SECTION_TITLE_ATTR)) return;
    node.textContent = node.getAttribute(DEFAULT_TITLE_ATTR) ?? '';
    node.removeAttribute(SECTION_TITLE_ATTR);
    node.removeAttribute(DEFAULT_TITLE_ATTR);
};

/** Set the page title, or — while a section title shows — the default it returns to. */
export const applyDefaultTitle = (title: string): void => {
    const node = titleNode();
    if (node.hasAttribute(SECTION_TITLE_ATTR)) {
        node.setAttribute(DEFAULT_TITLE_ATTR, title);
    } else {
        node.textContent = title;
    }
};
