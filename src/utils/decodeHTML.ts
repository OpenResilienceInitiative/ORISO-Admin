/**
 * All data within the tenant service is currently stored with HTML encoding in the backend upon saving.
 * E.g. "+" is encoded with "&#43;" and needs to be decoded appropriately.
 * See https://en.wikipedia.org/wiki/Character_encodings_in_HTML#HTML_character_references
 */
const decodeHTML = (input: string) =>
    // A parsed document is inert: unlike a div of the live page, it loads no <img> and runs no handlers.
    new DOMParser().parseFromString(input, 'text/html').documentElement.textContent ?? '';

export default decodeHTML;
