/**
 * Reference matching for the icon catalog generator (`generateIconCatalog.mjs`).
 *
 * A bare `content.includes(fileName)` falsely attributes any icon whose file
 * name is a suffix of another icon's file name: every file importing
 * `keyboard_arrow_down_24px.svg` contains the literal substring `x.svg`, so
 * `x.svg` was credited with usages it does not have. Matching therefore
 * anchors on how icons are actually referenced — as the last segment of an
 * import path or as a quoted string.
 */
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds the reference matcher for one icon file name. Cache it per icon —
 * the generator tests every icon against every source file.
 *
 * The leading boundary requires a path separator, quote or backtick, so a
 * longer file name (`..._24px.svg`) and a prose mention in a comment no longer
 * count as usages; the trailing lookahead rejects a longer file name that
 * merely starts with this one (`all_users.svg` vs `all_users_filled.svg`).
 *
 * Consequence: a same-directory reference with no leading separator or quote,
 * such as an unquoted `url(icon.svg)` in SCSS, is not matched. The repo has
 * none — every icon is referenced through a relative path.
 */
export const createIconReferenceMatcher = (fileName) =>
    new RegExp(`(?:^|[/'"\`])${escapeRegExp(fileName)}(?![A-Za-z0-9_-])`);

/** Convenience wrapper for single checks; prefer the cached matcher in loops. */
export const referencesIconFile = (content, fileName) => createIconReferenceMatcher(fileName).test(content);
