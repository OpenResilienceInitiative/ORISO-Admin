import { decodeHTML as decodeEntities } from 'entities';

/**
 * All data within the tenant service is currently stored with HTML encoding in the backend upon saving.
 * E.g. "+" is encoded with "&#43;" and needs to be decoded appropriately.
 * See https://en.wikipedia.org/wiki/Character_encodings_in_HTML#HTML_character_references
 */
// Text only, never markup: an HTML parser may still fetch <img>/<iframe> sources from a stored name.
// `entities` follows the HTML spec (full named table, windows-1252 remap) without building any DOM.
const decodeHTML = (input: string): string => decodeEntities(input);

export default decodeHTML;
