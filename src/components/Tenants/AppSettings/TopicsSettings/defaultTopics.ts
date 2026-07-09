/**
 * Default registration topics incl. all language variants (de/en/tr).
 *
 * Snapshot of the 16 live ORISO topics (ConsultingTypeService, 2026-07-07)
 * merged with the registration copy from ORISO-Frontend
 * (registrationDesign.ts). Read-only defaults for the admin Topics card;
 * real topic editing ships later.
 */

export type TopicTranslation = { title: string; description: string };

export interface DefaultTopic {
    id: number;
    slug: string;
    internalIdentifier: string;
    status: 'ACTIVE' | 'INACTIVE';
    translations: { de: TopicTranslation; en: TopicTranslation; tr: TopicTranslation };
}

export const DEFAULT_TOPICS: DefaultTopic[] = [
    {
        id: 1,
        slug: 'general-social-counselling',
        internalIdentifier: 'general-social',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Allgemeine Sozialberatung',
                description: 'Hilfe bei sozialen, finanziellen und persönlichen Fragen.',
            },
            en: {
                title: 'General social counselling',
                description: 'Help with social, financial, and personal questions.',
            },
            tr: {
                title: 'Genel sosyal danışmanlık',
                description: 'Sosyal, maddi ve kişisel sorularda yardım.',
            },
        },
    },
    {
        id: 2,
        slug: 'children-youth-counselling',
        internalIdentifier: 'children-youth',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Kinder und Jugendliche',
                description: 'Wenn der Alltag zu viel wird - hier gibt es Hilfe und ein offenes Ohr.',
            },
            en: {
                title: 'Children and young people',
                description: 'Support and a listening ear when everyday life becomes too much.',
            },
            tr: {
                title: 'Çocuklar ve gençler',
                description: 'Günlük yaşam fazla geldiğinde burada yardım ve sizi dinleyen biri var.',
            },
        },
    },
    {
        id: 3,
        slug: 'u25-suicide-prevention',
        internalIdentifier: 'u25-suicide-prevention',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'U25 Suizidprävention',
                description: 'Anonyme Begleitung für junge Menschen in Krisen und Suizidgedanken.',
            },
            en: {
                title: 'U25 suicide prevention',
                description: 'Anonymous support for young people in crisis or with suicidal thoughts.',
            },
            tr: {
                title: 'U25 intiharı önleme',
                description: 'Kriz yaşayan veya intihar düşünceleri olan gençler için anonim destek.',
            },
        },
    },
    {
        id: 4,
        slug: 'legal-guardianship-advance-care',
        internalIdentifier: 'legal-guardianship',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Rechtliche Betreuung und Vorsorge',
                description: 'Orientierung zu Betreuung, Vollmacht und persönlicher Vorsorge.',
            },
            en: {
                title: 'Legal guardianship and advance care',
                description: 'Guidance on guardianship, powers of attorney, and advance care.',
            },
            tr: {
                title: 'Yasal temsil ve önlem danışmanlığı',
                description: 'Vesayet, vekaletname ve kişisel önlemler konusunda yönlendirme.',
            },
        },
    },
    {
        id: 5,
        slug: 'counselling-men-boys',
        internalIdentifier: 'men-boys',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Jungen- und Männerberatung',
                description: 'Ein sicherer Raum für Männer und Jungen, um offen über Sorgen zu sprechen.',
            },
            en: {
                title: 'Counselling for men and boys',
                description: 'A safe space for men and boys to talk openly about worries.',
            },
            tr: {
                title: 'Erkek çocuklar ve erkekler için danışmanlık',
                description: 'Erkeklerin ve erkek çocukların endişelerini açıkça konuşabileceği güvenli bir alan.',
            },
        },
    },
    {
        id: 6,
        slug: 'hospice-palliative-care-counselling',
        internalIdentifier: 'hospice-palliative',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Hospiz- und Palliativberatung',
                description: 'Beratung bei schwerer Krankheit, Sterben, Abschied und Begleitung.',
            },
            en: {
                title: 'Hospice and palliative care',
                description: 'Counselling around serious illness, dying, farewell, and care.',
            },
            tr: {
                title: 'Hospis ve palyatif danışmanlık',
                description: 'Ağır hastalık, ölüm, veda ve bakım süreçlerinde danışmanlık.',
            },
        },
    },
    {
        id: 7,
        slug: 'hiv-aids',
        internalIdentifier: 'hiv-aids',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'HIV und Aids',
                description: 'Vertrauliche Beratung zu HIV, Aids, Gesundheit und Alltag.',
            },
            en: {
                title: 'HIV and AIDS',
                description: 'Confidential counselling about HIV, AIDS, health, and everyday life.',
            },
            tr: {
                title: 'HIV ve AIDS',
                description: 'HIV, AIDS, sağlık ve günlük yaşam hakkında gizli danışmanlık.',
            },
        },
    },
    {
        id: 8,
        slug: 'child-youth-rehabilitation',
        internalIdentifier: 'child-youth-rehab',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Kinder- und Jugend-Reha',
                description: 'Für junge Menschen, die nach Krankheit oder Belastung neue Kraft schöpfen möchten.',
            },
            en: {
                title: 'Child and youth rehabilitation',
                description: 'Rehabilitation guidance for children and young people.',
            },
            tr: {
                title: 'Çocuk ve gençlik rehabilitasyonu',
                description: 'Hastalık veya zorlanmadan sonra yeniden güç kazanmak isteyen gençler için.',
            },
        },
    },
    {
        id: 9,
        slug: 'initial-return-further-migration',
        internalIdentifier: 'migration',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Aus-, Rück- und Weiterwanderung',
                description: 'Beratung zu Migration, Rückkehr und nächsten Schritten.',
            },
            en: {
                title: 'Migration and return',
                description: 'Counselling on migration, return, and onward movement.',
            },
            tr: {
                title: 'Göç ve geri dönüş',
                description: 'Göç, geri dönüş ve sonraki adımlar hakkında danışmanlık.',
            },
        },
    },
    {
        id: 10,
        slug: 'parents-and-family',
        internalIdentifier: 'parents-family',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Eltern und Familie',
                description:
                    'Ob Erziehungsfragen, Konflikte oder familiäre Krisen - hier finden Sie verständnisvolle Begleitung.',
            },
            en: {
                title: 'Parents and family',
                description: 'Support for parenting questions, conflict, and family pressure.',
            },
            tr: {
                title: 'Ebeveynler ve aile',
                description: 'Ebeveynlik soruları, çatışmalar veya aile içi krizlerde anlayışlı destek bulabilirsiniz.',
            },
        },
    },
    {
        id: 11,
        slug: 'disability-psychological-impairment',
        internalIdentifier: 'disability-psych',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Behinderung und psychische Beeinträchtigung',
                description: 'Unterstuetzung bei Fragen zu Teilhabe, Alltag und Belastungen.',
            },
            en: {
                title: 'Disability and psychological impairment',
                description: 'Support for participation, everyday life, and psychological strain.',
            },
            tr: {
                title: 'Engellilik ve psikolojik zorlanma',
                description: 'Katılım, günlük yaşam ve psikolojik yüklerle ilgili sorularda destek.',
            },
        },
    },
    {
        id: 12,
        slug: 'pregnancy',
        internalIdentifier: 'pregnancy',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Schwangerschaft',
                description: 'Bei Fragen, Unsicherheit oder schwierigen Umständen sind wir da.',
            },
            en: {
                title: 'Pregnancy',
                description: 'Support for pregnancy-related questions and difficult circumstances.',
            },
            tr: {
                title: 'Hamilelik',
                description: 'Sorularınız, belirsizlikleriniz veya zor durumlarınız olduğunda yanınızdayız.',
            },
        },
    },
    {
        id: 13,
        slug: 'offending',
        internalIdentifier: 'offending',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Straffälligkeit',
                description: 'Begleitung bei Fragen zu Straffälligkeit, Neustart und Alltag.',
            },
            en: {
                title: 'Offending',
                description: 'Support for questions around offending, restart, and daily life.',
            },
            tr: {
                title: 'Suç ve yeniden başlangıç',
                description: 'Suç, yeniden başlangıç ve günlük yaşamla ilgili sorularda destek.',
            },
        },
    },
    {
        id: 14,
        slug: 'debt',
        internalIdentifier: 'debt',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Schulden',
                description: 'Beratung bei finanziellen Sorgen, Mahnungen und Überschuldung.',
            },
            en: {
                title: 'Debt',
                description: 'Counselling for financial worries, reminders, and over-indebtedness.',
            },
            tr: {
                title: 'Borç',
                description: 'Maddi kaygılar, ihtarlar ve aşırı borçlanma konusunda danışmanlık.',
            },
        },
    },
    {
        id: 15,
        slug: 'life-in-old-age',
        internalIdentifier: 'life-in-old-age',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Leben im Alter',
                description: 'Unterstuetzung bei Fragen rund um Alter, Pflege und Alltag.',
            },
            en: {
                title: 'Life in old age',
                description: 'Support for questions around ageing, care, and everyday life.',
            },
            tr: {
                title: 'Yaşlılıkta yaşam',
                description: 'Yaşlanma, bakım ve günlük yaşamla ilgili sorularda destek.',
            },
        },
    },
    {
        id: 16,
        slug: 'cures-mothers-fathers',
        internalIdentifier: 'cures-parents',
        status: 'ACTIVE',
        translations: {
            de: {
                title: 'Kuren für Mütter und Väter',
                description: 'Kurmaßnahmen helfen erschöpften Eltern, wieder zu sich zu finden.',
            },
            en: {
                title: 'Rehabilitation cures for parents',
                description: 'Guidance on recovery programs for exhausted parents.',
            },
            tr: {
                title: 'Anneler ve babalar için kürler',
                description:
                    'Yorgun ebeveynlerin yeniden güç toplamasına yardımcı olan kür programları hakkında danışmanlık.',
            },
        },
    },
];
