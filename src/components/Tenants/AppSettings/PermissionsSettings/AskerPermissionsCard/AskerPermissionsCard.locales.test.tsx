import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../../../../i18n';
import { AskerPermissionsCard } from './index';

const expectations = {
    de: [
        'Benachrichtigungen nach Gesprächstyp',
        'E-Mail für Beratung',
        'E-Mail für Live-Chat',
        'E-Mail für Selbsthilfegruppen',
        'Browser für Beratung',
        'Browser für Live-Chat',
        'Browser für Selbsthilfegruppen',
    ],
    'de@informal': [
        'Benachrichtigungen nach Gesprächstyp',
        'E-Mail für Beratung',
        'E-Mail für Live-Chat',
        'E-Mail für Selbsthilfegruppen',
        'Browser für Beratung',
        'Browser für Live-Chat',
        'Browser für Selbsthilfegruppen',
    ],
    en: [
        'Notifications by conversation type',
        'Email for counselling',
        'Email for live chat',
        'Email for self-help groups',
        'Browser for counselling',
        'Browser for live chat',
        'Browser for self-help groups',
    ],
    fr: [
        'Notifications par type de conversation',
        'E-mail pour le conseil',
        'E-mail pour le chat en direct',
        'E-mail pour les groupes d’entraide',
        'Navigateur pour le conseil',
        'Navigateur pour le chat en direct',
        'Navigateur pour les groupes d’entraide',
    ],
    ru: [
        'Уведомления по типу беседы',
        'Электронная почта для консультаций',
        'Электронная почта для живого чата',
        'Электронная почта для групп взаимопомощи',
        'Браузер для консультаций',
        'Браузер для живого чата',
        'Браузер для групп взаимопомощи',
    ],
    tr: [
        'Görüşme türüne göre bildirimler',
        'Danışmanlık için e-posta',
        'Canlı sohbet için e-posta',
        'Öz yardım grupları için e-posta',
        'Danışmanlık için tarayıcı',
        'Canlı sohbet için tarayıcı',
        'Öz yardım grupları için tarayıcı',
    ],
    ti: [
        'ምልክታታት ብዓይነት ዝርርብ',
        'ኢ-መይል ንምኽሪ',
        'ኢ-መይል ንቀጥታ ዝርርብ',
        'ኢ-መይል ንጉጅለታት ርእሰ-ሓገዝ',
        'መርበብ መርኣዪ ንምኽሪ',
        'መርበብ መርኣዪ ንቀጥታ ዝርርብ',
        'መርበብ መርኣዪ ንጉጅለታት ርእሰ-ሓገዝ',
    ],
} as const;
afterEach(cleanup);
describe('conversation notification policy labels', () => {
    it.each(Object.entries(expectations))('renders all seven new feature strings in %s', async (language, labels) => {
        await i18n.changeLanguage(language);
        render(
            <I18nextProvider i18n={i18n}>
                <AskerPermissionsCard restrictedFields={new Set()} />
            </I18nextProvider>,
        );
        expect(screen.getByRole('heading', { name: labels[0] })).toBeTruthy();
        labels.slice(1).forEach((label) => {
            expect(screen.getByRole('button', { name: new RegExp(`^${label}:`) })).toBeTruthy();
        });
    });
});
