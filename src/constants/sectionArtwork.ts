import appearance from '../resources/img/sections/appearance.webp';
import emailServer from '../resources/img/sections/email_server.webp';
import functionalities from '../resources/img/sections/functionalities.webp';
import functionalityAccess from '../resources/img/sections/functionality_access.webp';
import globalSettings from '../resources/img/sections/global_settings.webp';
import legal from '../resources/img/sections/legal.webp';
import masterData from '../resources/img/sections/master_data.webp';

/**
 * Artwork for the mobile section carousel, keyed by the `iconName` a section
 * carries in {@link getSettingsTabs} — one key, no second mapping to drift.
 *
 * 192×192 WebP (2× for the 96px card), downscaled with Lanczos from the 1254px
 * originals in the shared drive under
 * `ORISO CC/02 | Images : Graphics : Illustrations/admin settings-section-gen
 * icons original`. Quality 92 — ~4 kB each, 41 dB PSNR against the resized
 * source, which keeps the grain in the illustrations intact. Re-export from the
 * originals rather than upscaling these if a larger size is ever needed.
 *
 * Not every section has artwork: `global_config` has none yet, and new sections
 * arrive before their illustration does. Those fall back to the section icon on
 * a tonal surface (see `SectionCard`), so a missing entry is a normal state and
 * never a broken card.
 */
export const SECTION_ARTWORK: Record<string, string> = {
    appearance,
    email_server: emailServer,
    functionalities,
    functionality_access: functionalityAccess,
    global_settings: globalSettings,
    legal,
    master_data: masterData,
};

export const getSectionArtwork = (iconName: string): string | undefined => SECTION_ARTWORK[iconName];
