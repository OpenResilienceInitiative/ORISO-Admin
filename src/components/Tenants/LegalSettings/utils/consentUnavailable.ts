/**
 * Why the consent sentence of a data-protection policy cannot be edited for the
 * current selection (#914). The consent editor itself is unchanged — #862 keeps
 * "Alle Fachbereiche" consent-free — this only names the reason so the editor can
 * say it out loud instead of leaving the slot empty.
 */
export type ConsentUnavailableReason =
    /** The Beratungsstelle has no Fachbereich at all, so the switcher never renders. */
    | 'noDepartments'
    /** Fachbereiche exist, but the switcher is on the agency-wide entry. */
    | 'allDepartments';

/**
 * Operator disclaimer for a Beratungsstelle without a single Fachbereich (#914).
 *
 * Copy comes from the product owner and is stored HERE, not in the admin UI
 * bundles, for one reason: the admin panel ships `de` and `en` only, while this
 * text has to exist in all seven legal-content languages — the same set the
 * consent sentence it stands in for is written in. Putting it in `translation.json`
 * would make five of the seven unreachable.
 *
 * `ti` is a first-pass draft flagged low-confidence by the owner and still needs a
 * native-speaker review before the platform leans on it (#914).
 */
export const CONSENT_DISCLAIMER_BY_LANGUAGE: Record<string, string> = {
    de:
        'Für diese Beratungsstelle ist noch kein Fachbereich hinterlegt. Ohne Fachbereich kann keine ' +
        'zertifizierte Beratung im Sinne der Datenschutz- und Einwilligungsanforderungen angeboten werden — ' +
        'bis ein Fachbereich eingerichtet ist, sind hier gezeigte Inhalte als unverbindliche persönliche ' +
        'Auskunft zu verstehen, nicht als zertifizierte Beratungsleistung. Wir raten daher derzeit von einer ' +
        'Beratung über diese Beratungsstelle ab. Führen Sie den Betrieb dennoch fort, geschieht dies ' +
        'ausschließlich auf eigene Verantwortung und Gefahr.',
    en:
        'No Fachbereich has been set up for this counselling centre yet. Without one, no certified ' +
        'counselling service can be offered under the data-protection and consent requirements — until a ' +
        'Fachbereich is configured, content shown here should be treated as informal personal information, ' +
        'not a certified counselling service. We therefore currently advise against providing counselling ' +
        'through this centre. If you continue to operate it regardless, you do so entirely at your own risk ' +
        'and responsibility.',
    fr:
        "Aucun secteur (Fachbereich) n'a encore été configuré pour ce centre de conseil. Sans secteur, aucun " +
        'conseil certifié ne peut être proposé conformément aux exigences en matière de protection des ' +
        "données et de consentement — tant qu'aucun secteur n'est configuré, le contenu affiché ici doit " +
        'être considéré comme une information personnelle informelle, et non comme une prestation de ' +
        'conseil certifiée. Nous déconseillons donc actuellement de proposer des conseils via ce centre. Si ' +
        'vous poursuivez néanmoins son activité, vous le faites entièrement à vos propres risques et sous ' +
        'votre seule responsabilité.',
    ru:
        'Для этого консультационного центра ещё не настроен ни один профиль (Fachbereich). Без профиля ' +
        'невозможно предоставлять сертифицированную консультацию в соответствии с требованиями защиты ' +
        'данных и согласия — пока профиль не настроен, отображаемое здесь содержание следует рассматривать ' +
        'как неофициальную личную информацию, а не как сертифицированную консультационную услугу. Поэтому в ' +
        'настоящее время мы не рекомендуем проводить консультации через этот центр. Если вы всё же ' +
        'продолжаете его работу, вы делаете это исключительно на свой страх и риск и под свою ' +
        'ответственность.',
    tr:
        'Bu danışma merkezi için henüz bir birim (Fachbereich) tanımlanmamıştır. Birim olmadan, veri koruma ' +
        've onay gereklilikleri kapsamında sertifikalı bir danışmanlık hizmeti sunulamaz — bir birim ' +
        'oluşturulana kadar burada gösterilen içerik, sertifikalı bir danışmanlık hizmeti değil, bağlayıcı ' +
        'olmayan kişisel bir bilgi olarak değerlendirilmelidir. Bu nedenle şu anda bu merkez üzerinden ' +
        'danışmanlık verilmesini önermiyoruz. Buna rağmen faaliyete devam ederseniz, bunu tamamen kendi risk ' +
        've sorumluluğunuzda yaparsınız.',
    uk:
        'Для цього консультаційного центру ще не налаштовано жодного напряму (Fachbereich). Без напряму ' +
        'неможливо надавати сертифіковану консультацію відповідно до вимог щодо захисту даних і згоди — доки ' +
        'напрям не налаштовано, показаний тут контент слід розглядати як неофіційну особисту інформацію, а ' +
        'не як сертифіковану консультаційну послугу. Тому наразі ми не рекомендуємо надавати консультації ' +
        'через цей центр. Якщо ви все ж продовжуєте його діяльність, ви робите це виключно на власний ризик ' +
        'і відповідальність.',
    ti:
        'ነዚ ቤት ምኽሪ እዚ ገና ዝኾነ ዓውዲ (Fachbereich) ኣይተመዝገበን። ብዘይ ዓውዲ፡ ብመሰረት ናይ ውሕስነት ሓበሬታን ስምምዕን ' +
        'ዘድልዮ ብዕሊ ዝተመስከረ ምኽሪ ክወሃብ ኣይክእልን እዩ — ዓውዲ ክሳብ ዝቐውም፡ ኣብዚ ዝርአ ትሕዝቶ ከም ዘይግዴታዊ ውልቃዊ ሓበሬታ ደኣ ' +
        'እምበር ከም ዝተመስከረ ኣገልግሎት ምኽሪ ክውሰድ የብሉን። ስለዚ ሕጂ ብዛዕባ እዚ ቤት ምኽሪ ምኽሪ ክወሃብ ኣይንመክርን ኢና። ' +
        "ይኹን'ምበር ንጥፈት እንተቐጺልኩም፡ ብጠቕላላ ብናትኩም ሓደጋን ሓላፍነትን እዩ።",
};

/** The language the disclaimer falls back to when the active one has no copy yet. */
export const CONSENT_DISCLAIMER_FALLBACK_LANGUAGE = 'de';

/**
 * The disclaimer for one legal-content language.
 *
 * It follows the editor's CONTENT language, not the admin's UI language: the
 * disclaimer stands in the place of the consent sentence, and that sentence is
 * written per content language (the same rule `useConsentTemplates` follows for the
 * platform template, owner review #864 / #874). Regional codes (`de-CH`) resolve to
 * their base language; anything still unknown falls back to German rather than
 * showing an empty legal notice.
 */
export const consentDisclaimerFor = (language: string | undefined): string => {
    const base = (language ?? '').split('-')[0].toLowerCase();
    return CONSENT_DISCLAIMER_BY_LANGUAGE[base] ?? CONSENT_DISCLAIMER_BY_LANGUAGE[CONSENT_DISCLAIMER_FALLBACK_LANGUAGE];
};
