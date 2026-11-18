import { describe, expect, it } from 'vite-plus/test';
import de from './de/translation.json';
import en from './en/translation.json';

/**
 * ORISO-Helm#466: voice messages and media upload are encrypted by the app and
 * sent straight to the chat server, which cannot check the switch. The text
 * must say the switch only hides the button and must not promise a block.
 */
describe('voice message and media upload switches are described honestly', () => {
    const key = 'tenants.permissions.feature.appOnlyHint';

    it('says in German that only the button is hidden and the server cannot check it', () => {
        expect(de[key]).toMatch(/blendet .*aus/);
        expect(de[key]).toMatch(/kann das nicht prüfen/);
    });

    it('says in English that only the button is hidden and the server cannot check it', () => {
        expect(en[key]).toMatch(/hides/);
        expect(en[key]).toMatch(/cannot check/);
    });

    it('no longer tells the one-on-one help that switched-off features simply do not appear', () => {
        expect(de['tileHelp.oneOnOne.features.body']).toMatch(/Sprachnachrichten und Dateien/);
        expect(en['tileHelp.oneOnOne.features.body']).toMatch(/voice messages and files/i);
    });
});
