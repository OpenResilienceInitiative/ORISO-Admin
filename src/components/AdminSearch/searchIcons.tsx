import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import { NavGlyph, type NavGlyphName } from '../NavGlyph';
import type { SearchDoc } from './searchTypes';

/**
 * The icon of a result. Where the sidebar already has a glyph for a thing (Träger, Beratungsstellen,
 * Themen, Konten, Logs …) the result uses that very glyph, so "Beratungsstelle" looks the same in the
 * menu and in the search. Only tiles inside a settings page keep a neutral "tune" icon: they are not
 * a destination of the sidebar.
 */
const PAGE_GLYPHS: Record<string, NavGlyphName> = {
    'page:home': 'home',
    'page:theme': 'displaySettings',
    'page:tenants': 'tenants',
    'page:agency': 'counseling',
    'page:counselors': 'users',
    'page:statistics': 'statistics',
    'page:links': 'links',
    'page:logs': 'logs',
    'page:account': 'profile',
    'page:topics': 'topics',
    'page:found-agency': 'counseling',
    'page:found-tenant': 'tenants',
};

const PREFIX_GLYPHS: Record<string, NavGlyphName> = {
    settings: 'displaySettings',
    users: 'users',
    links: 'links',
    logs: 'logs',
    tenant: 'tenants',
    agency: 'counseling',
};

const KIND_GLYPHS: Partial<Record<SearchDoc['kind'], NavGlyphName>> = {
    topic: 'topics',
    // A Fachbereich is a topic assigned to an agency, so it wears the topic glyph.
    department: 'topics',
    tenant: 'tenants',
    agency: 'counseling',
    account: 'users',
};

export const glyphFor = (doc: Pick<SearchDoc, 'id' | 'kind' | 'level'>): NavGlyphName | undefined => {
    const byKind = KIND_GLYPHS[doc.kind];

    if (byKind) {
        return byKind;
    }

    if (doc.kind === 'page' || doc.kind === 'tab') {
        const id = doc.id.split('@')[0];

        return PAGE_GLYPHS[id] ?? PREFIX_GLYPHS[id.split(':')[0]];
    }

    // Personal tiles (password, language, absence …) belong to "My account".
    return doc.level === 'personal' ? 'profile' : undefined;
};

export const ResultIcon = ({ doc, className }: { doc: SearchDoc; className?: string }) => {
    const glyph = glyphFor(doc);

    return glyph ? <NavGlyph name={glyph} className={className} /> : <TuneOutlinedIcon className={className} />;
};
