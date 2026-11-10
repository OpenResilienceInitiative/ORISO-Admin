import familyIcon from './assets/t-01-eltern-und-familie.png';
import debtIcon from './assets/t-05-schulden.png';
import addictionIcon from './assets/t-04-sucht.png';

import type { SupportedLanguageCode } from '../../../constants/supportedLanguages';

export interface PreviewTopic {
    id: number;
    labels: Record<SupportedLanguageCode, string>;
    icon?: string;
}

/** Example IDs; translated catalogue snapshots and explicitly authored preview labels. */
export const topics: PreviewTopic[] = [
    {
        id: 101,
        labels: {
            de: 'Eltern und Familie',
            en: 'Parents and family',
            uk: 'Батьки та сім’я',
            fr: 'Éducation et famille',
            ru: 'Воспитание и семья',
            tr: 'Eğitim ve aile',
            ti: 'ኣተዓባብያን ስድራቤትን',
        },
        icon: familyIcon,
    },
    {
        id: 102,
        labels: {
            de: 'Schulden',
            en: 'Debt',
            uk: 'Борги',
            fr: 'Dettes et insolvabilité',
            ru: 'Долги и банкротство',
            tr: 'Borç ve iflas',
            ti: 'ዕዳን ክሳራን',
        },
        icon: debtIcon,
    },
    {
        id: 103,
        labels: {
            de: 'Sucht',
            en: 'Addiction',
            uk: 'Залежність',
            fr: 'Addiction',
            ru: 'Зависимость',
            tr: 'Bağımlılık',
            ti: 'ወልፊ',
        },
        icon: addictionIcon,
    },
    {
        id: 104,
        labels: {
            de: 'Rechtliche Betreuung und Vorsorge',
            en: 'Legal guardianship and advance directives',
            uk: 'Правова опіка та завчасні розпорядження',
            fr: 'Protection juridique',
            ru: 'Правовое попечительство',
            tr: 'Yasal vesayet',
            ti: 'ሕጋዊ ሞግዚትነት',
        },
    },
    {
        id: 105,
        labels: {
            de: 'Allgemeine Sozialberatung',
            en: 'General social counselling',
            uk: 'Загальне соціальне консультування',
            fr: 'Conseil social général',
            ru: 'Общая социальная консультация',
            tr: 'Genel sosyal danışmanlık',
            ti: 'ሓፈሻዊ ማሕበራዊ ምኽሪ',
        },
    },
    {
        id: 106,
        labels: {
            de: 'Kinder und Jugendliche',
            en: 'Children and young people',
            uk: 'Діти та молодь',
            fr: 'Enfance et jeunesse',
            ru: 'Дети и молодёжь',
            tr: 'Çocuklar ve gençler',
            ti: 'ቆልዑን መንእሰያትን',
        },
    },
    {
        id: 107,
        labels: {
            de: '[U25] Suizidprävention',
            en: '[U25] Suicide prevention',
            uk: '[U25] Запобігання самогубствам',
            fr: '[U25] Prévention du suicide',
            ru: '[U25] Профилактика самоубийств',
            tr: '[U25] İntiharı önleme',
            ti: '[U25] ምክልኻል ርእሰ ቅትለት',
        },
    },
    {
        id: 108,
        labels: {
            de: 'Jungen- und Männerberatung',
            en: 'Counselling for boys and men',
            uk: 'Консультування хлопців і чоловіків',
            fr: 'Conseil pour les garçons et les hommes',
            ru: 'Консультирование мальчиков и мужчин',
            tr: 'Erkek çocuklar ve erkekler için danışmanlık',
            ti: 'ምኽሪ ንኣወዳትን ደቂ ተባዕትዮን',
        },
    },
    {
        id: 109,
        labels: {
            de: 'Hospiz- und Palliativberatung',
            en: 'Hospice and palliative care counselling',
            uk: 'Хоспісне та паліативне консультування',
            fr: 'Soins palliatifs',
            ru: 'Хоспис и паллиативная помощь',
            tr: 'Hospis ve palyatif bakım',
            ti: 'ሆስፒስን ፓልያቲቭን',
        },
    },
    {
        id: 110,
        labels: {
            de: 'HIV und Aids',
            en: 'HIV and AIDS',
            uk: 'ВІЛ та СНІД',
            fr: 'VIH et sida',
            ru: 'ВИЧ и СПИД',
            tr: 'HIV ve AIDS',
            ti: 'ኤች.ኣይ.ቪን ኤይድስን',
        },
    },
    {
        id: 111,
        labels: {
            de: 'Kinder- und Jugend-Reha',
            en: 'Rehabilitation for children and young people',
            uk: 'Реабілітація дітей та молоді',
            fr: 'Rééducation des enfants et des jeunes',
            ru: 'Реабилитация детей и молодёжи',
            tr: 'Çocuk ve genç rehabilitasyonu',
            ti: 'ተሃድሶ ቆልዑን መንእሰያትን',
        },
    },
    {
        id: 112,
        labels: {
            de: 'Aus-/Rück- und Weiterwanderung',
            en: 'Emigration, return and onward migration',
            uk: 'Еміграція, повернення та подальша міграція',
            fr: 'Départ et perspectives',
            ru: 'Выезд и перспективы',
            tr: 'Ülkeden ayrılma ve gelecek planı',
            ti: 'ምውጻእን መጻኢ ራእይን',
        },
    },
    {
        id: 113,
        labels: {
            de: 'Behinderung und psychische Beeinträchtigung',
            en: 'Disability and mental health impairment',
            uk: 'Інвалідність та порушення психічного здоров’я',
            fr: 'Trouble psychique',
            ru: 'Психические нарушения',
            tr: 'Ruhsal sorunlar',
            ti: 'ናይ ኣእምሮ ጸገም',
        },
    },
    {
        id: 114,
        labels: {
            de: 'Schwangerschaft',
            en: 'Pregnancy',
            uk: 'Вагітність',
            fr: 'Grossesse',
            ru: 'Беременность',
            tr: 'Gebelik',
            ti: 'ጥንሲ',
        },
    },
    {
        id: 115,
        labels: {
            de: 'Straffälligkeit',
            en: 'Offending and rehabilitation',
            uk: 'Правопорушення та реабілітація',
            fr: 'Délinquance',
            ru: 'Судимость',
            tr: 'Suç geçmişi',
            ti: 'ገበናዊ ተግባር',
        },
    },
    {
        id: 116,
        labels: {
            de: 'Leben im Alter',
            en: 'Later life',
            uk: 'Життя в літньому віці',
            fr: 'Grand âge et dépendance',
            ru: 'Пожилой возраст и уход',
            tr: 'Yaşlılık ve bakım danışmanlığı',
            ti: 'እርጋንን ምኽሪ ክንክንን',
        },
    },
    {
        id: 117,
        labels: {
            de: 'Kuren für Mütter und Väter',
            en: 'Health retreats for mothers and fathers',
            uk: 'Оздоровлення матерів і батьків',
            fr: 'Cure de repos',
            ru: 'Оздоровительный курс',
            tr: 'Kür danışmanlığı',
            ti: 'ምኽሪ ናይ ኩር',
        },
    },
    {
        id: 118,
        labels: {
            de: 'Trauerberatung',
            en: 'Bereavement counselling',
            uk: 'Консультування щодо втрати',
            fr: 'Accompagnement du deuil',
            ru: 'Помощь при утрате',
            tr: 'Yas danışmanlığı',
            ti: 'ምኽሪ ሓዘን',
        },
    },
    {
        id: 119,
        labels: {
            de: 'Übergang von Schule zu Beruf',
            en: 'Transition from school to work',
            uk: 'Перехід від школи до роботи',
            fr: 'De l’école au métier',
            ru: 'От школы к профессии',
            tr: 'Okuldan mesleğe',
            ti: 'ካብ ቤት ትምህርቲ ናብ ሞያ',
        },
    },
    {
        id: 120,
        labels: {
            de: 'Migration',
            en: 'Migration',
            uk: 'Міграція',
            fr: 'Conseil en migration',
            ru: 'Консультация по вопросам миграции',
            tr: 'Göç danışmanlığı',
            ti: 'ምኽሪ ስደት',
        },
    },
];
