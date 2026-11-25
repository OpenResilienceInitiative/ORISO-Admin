/**
 * The plain text of a machine translation. The service answers in HTML: tags become spaces and
 * entities are decoded ("Health &amp; care" → "Health & care"), so neither is shown or saved.
 * DOMParser builds an inert document, so nothing in the answer runs or loads.
 */
export const machineText = (html: string | undefined): string => {
    const spaced = (html ?? '').replace(/<[^>]*>/g, ' ');
    const decoded = new DOMParser().parseFromString(spaced, 'text/html').body.textContent ?? '';
    return decoded.replace(/\s+/g, ' ').trim();
};
