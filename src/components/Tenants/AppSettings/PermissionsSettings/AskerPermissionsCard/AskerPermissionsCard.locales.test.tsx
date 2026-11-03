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
// FE#1725: the card shows channel switches only for tiles hidden on the page.
const ALL_CHANNELS = ['AgencyCounselling', 'LiveChat', 'SelfHelp'].flatMap((context) =>
    ['email', 'browser'].map((channel) => ({
        field: `featureAsker${channel === 'email' ? 'Email' : 'Browser'}${context}Enabled`,
        labelKey: `tenants.permissions.asker.channels.${channel}${context}`,
    })),
);
afterEach(cleanup);
describe('conversation notification policy labels', () => {
    it.each(Object.entries(expectations))('renders all seven new feature strings in %s', async (language, labels) => {
        await i18n.changeLanguage(language);
        render(
            <I18nextProvider i18n={i18n}>
                <AskerPermissionsCard restrictedFields={new Set()} channelToggles={ALL_CHANNELS} />
            </I18nextProvider>,
        );
        expect(screen.getByRole('heading', { name: labels[0] })).toBeTruthy();
        labels.slice(1).forEach((label) => {
            expect(screen.getByRole('button', { name: new RegExp(`^${label}:`) })).toBeTruthy();
        });
    });
});

const collectionLabels = {
    de: [
        'Wo eine E-Mail-Adresse hinterlassen werden darf',
        'E-Mail-Adresse bei Beratung',
        'E-Mail-Adresse im Live-Chat',
        'E-Mail-Adresse in Selbsthilfegruppen',
    ],
    'de@informal': [
        'Wo eine E-Mail-Adresse hinterlassen werden darf',
        'E-Mail-Adresse bei Beratung',
        'E-Mail-Adresse im Live-Chat',
        'E-Mail-Adresse in Selbsthilfegruppen',
    ],
    en: [
        'Where an email address may be left',
        'Email address in agency counselling',
        'Email address in live chat',
        'Email address in self-help groups',
    ],
    fr: [
        'Où une adresse e-mail peut être communiquée',
        'Adresse e-mail pour le conseil',
        'Adresse e-mail dans le chat en direct',
        'Adresse e-mail dans les groupes d’entraide',
    ],
    ru: [
        'Где можно оставить адрес электронной почты',
        'Адрес электронной почты при консультировании',
        'Адрес электронной почты в живом чате',
        'Адрес электронной почты в группах взаимопомощи',
    ],
    tr: [
        'E-posta adresinin bırakılabileceği yerler',
        'Danışmanlıkta e-posta adresi',
        'Canlı sohbette e-posta adresi',
        'Öz yardım gruplarında e-posta adresi',
    ],
    ti: ['ኣድራሻ ኢ-መይል ክግደፈሉ ዝኽእል ቦታ', 'ኣድራሻ ኢ-መይል ኣብ ምኽሪ', 'ኣድራሻ ኢ-መይል ኣብ ቀጥታ ዝርርብ', 'ኣድራሻ ኢ-መይል ኣብ ጉጅለታት ርእሰ-ሓገዝ'],
};

it.each(Object.entries(collectionLabels))(
    'translates the three distinct collection controls in %s',
    async (language, labels) => {
        await i18n.changeLanguage(language);
        render(
            <I18nextProvider i18n={i18n}>
                <AskerPermissionsCard
                    restrictedFields={new Set()}
                    permissionPolicies={{ featureAskerEmailEnabled: { value: false, mode: 'SUGGESTED' } }}
                />
            </I18nextProvider>,
        );
        expect(screen.getByRole('heading', { name: labels[0] })).toBeVisible();
        labels.slice(1).forEach((label) => {
            expect(screen.getByRole('button', { name: new RegExp(`^${label}:`) })).toBeDisabled();
        });
        expect(screen.getAllByText(i18n.t('tenants.permissions.asker.collection.masterOff'))).toHaveLength(3);
        expect(screen.queryByText('tenants.permissions.asker.collection.description')).toBeNull();
    },
);
