import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false });

const isHttps = (url: string) => /^https:\/\//i.test(url.trim());

markdown.renderer.rules.image = (tokens, index) => {
    const token = tokens[index];
    const src = token.attrGet('src') ?? '';
    const alt = markdown.utils.escapeHtml(token.content);
    if (!isHttps(src)) {
        return alt;
    }
    const title = token.attrGet('title');
    return `<img src="${markdown.utils.escapeHtml(src)}" alt="${alt}"${
        title ? ` title="${markdown.utils.escapeHtml(title)}"` : ''
    } loading="lazy">`;
};

/**
 * HTML for an add-on readme: raw HTML in the Markdown is shown as text, images load over https only,
 * links open in a new tab. DOMPurify runs last as a second guard.
 */
export const renderReadme = (source: string): string => {
    const fragment = DOMPurify.sanitize(markdown.render(source), {
        ADD_ATTR: ['loading'],
        ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i,
        RETURN_DOM_FRAGMENT: true,
    });
    fragment.querySelectorAll('a[href]').forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
    const host = document.createElement('div');
    host.appendChild(fragment);
    return host.innerHTML;
};
