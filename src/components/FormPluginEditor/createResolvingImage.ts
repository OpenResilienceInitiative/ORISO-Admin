import Image from '@tiptap/extension-image';
import { tenantServiceURL } from '../../appConfig';
import { resolveTenantMediaUrl } from './resolveTenantMediaUrl';

/**
 * TipTap Image extension whose editing NodeView displays `/media/{id}` sources
 * resolved against the TenantService origin, while serialization (getHTML /
 * save) keeps the stored `src` relative. The document model is untouched, so
 * there is no value/onChange round-trip to keep in sync.
 */
export const ResolvingImage = Image.extend({
    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement('img');
            const src = node.attrs.src as string | undefined;
            const resolved = resolveTenantMediaUrl(src, tenantServiceURL);
            if (resolved) {
                dom.setAttribute('src', resolved);
            }
            if (node.attrs.alt) {
                dom.setAttribute('alt', node.attrs.alt as string);
            }
            if (node.attrs.title) {
                dom.setAttribute('title', node.attrs.title as string);
            }
            return { dom };
        };
    },
});
