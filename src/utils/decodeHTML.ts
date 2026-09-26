/**
 * All data within the tenant service is currently stored with HTML encoding in the backend upon saving.
 * E.g. "+" is encoded with "&#43;" and needs to be decoded appropriately.
 * See https://en.wikipedia.org/wiki/Character_encodings_in_HTML#HTML_character_references
 */
const NAMED_ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    auml: 'ä',
    ouml: 'ö',
    uuml: 'ü',
    Auml: 'Ä',
    Ouml: 'Ö',
    Uuml: 'Ü',
    szlig: 'ß',
    euro: '€',
};

const ENTITY = /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi;

const MAX_CODE_POINT = 0x10ffff;

const decodeEntity = (match: string, body: string): string => {
    if (body[0] !== '#') return NAMED_ENTITIES[body] ?? match;
    const code =
        body[1].toLowerCase() === 'x' ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
    return code > 0 && code <= MAX_CODE_POINT ? String.fromCodePoint(code) : match;
};

// Entities only, never markup: any HTML parser may still fetch <img>/<iframe> sources from a stored name.
const decodeHTML = (input: string): string => input.replace(ENTITY, decodeEntity);

export default decodeHTML;
