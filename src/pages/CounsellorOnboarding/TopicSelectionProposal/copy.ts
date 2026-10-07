import type { SupportedLanguageCode } from '../../../constants/supportedLanguages';

interface ProposalCopy {
    preview: string;
    title: string;
    name: string;
    choose: string;
    description: string;
    search: string;
    selected: string;
    apply: string;
    cancel: string;
    remove: string;
    locked: string;
    lockedHint: string;
    minimum: string;
    single: string;
    agencyOnly: string;
    catalogue: string;
    fixed: string;
    fixtureIcons: string;
    noIcon: string;
    noResults: string;
    clear: string;
    loading: string;
    error: string;
    retry: string;
    empty: string;
    summary: string;
    language: string;
    count: string;
}

export const resources = {
    de: {
        proposal: {
            preview: 'Designvorschlag · Beispieldaten, keine Konto- oder Themenänderung',
            title: 'Themen Ihrer Beratung',
            name: 'Anzeigename',
            choose: 'Themen auswählen',
            description: 'Suchen Sie ein Thema und überprüfen Sie Ihre Auswahl, bevor Sie sie übernehmen.',
            search: 'Themen suchen',
            selected: 'Ausgewählt ({{count}})',
            apply: 'Anwenden',
            cancel: 'Abbrechen',
            remove: '{{name}} entfernen',
            locked: 'Fest vorgegeben',
            lockedHint: 'Fest vorgegebene Themen bleiben ausgewählt.',
            minimum: 'Wählen Sie mindestens ein Thema.',
            single: 'Sie können genau ein Thema Ihrer Beratungsstelle wählen.',
            agencyOnly: 'Zur Auswahl stehen die freigegebenen Themen Ihrer Beratungsstelle.',
            catalogue:
                'Zur Auswahl stehen die freigegebenen Themen des Katalogs. Es werden keine neuen Themen erstellt.',
            fixed: 'Dieses Thema wurde in Ihrer Einladung festgelegt.',
            fixtureIcons:
                'Icons aus dem bestehenden ORISO-Katalog. Die Zuordnung zu Beispiel-IDs ist nur für diesen Vorschlag.',
            noIcon: 'Kein Icon hinterlegt',
            noResults: 'Keine passenden Themen gefunden.',
            clear: 'Suche zurücksetzen',
            loading: 'Themen werden geladen …',
            error: 'Die Themen konnten nicht geladen werden.',
            retry: 'Erneut versuchen',
            empty: 'Es stehen keine freigegebenen Themen zur Auswahl. Bitte wenden Sie sich an die einladende Person.',
            summary: 'Übernommene Themen',
            language: 'Sprache',
            count: '{{count}} Themen verfügbar',
        },
    },
    en: {
        proposal: {
            preview: 'Design preview · Example data, no account or topic changes',
            title: 'Your counselling topics',
            name: 'Display name',
            choose: 'Choose topics',
            description: 'Search for a topic and review your selection before applying it.',
            search: 'Search topics',
            selected: 'Selected ({{count}})',
            apply: 'Apply',
            cancel: 'Cancel',
            remove: 'Remove {{name}}',
            locked: 'Required',
            lockedHint: 'Required topics remain selected.',
            minimum: 'Choose at least one topic.',
            single: 'You can choose exactly one topic of your counselling centre.',
            agencyOnly: 'Only the permitted topics of your counselling centre are available.',
            catalogue: 'Choose from the permitted catalogue topics. No new topics are created.',
            fixed: 'This topic was specified in your invitation.',
            fixtureIcons:
                'Icons from the existing ORISO catalogue. Their example-ID mapping is only for this proposal.',
            noIcon: 'No icon supplied',
            noResults: 'No matching topics found.',
            clear: 'Clear search',
            loading: 'Loading topics …',
            error: 'The topics could not be loaded.',
            retry: 'Try again',
            empty: 'No permitted topics are available. Please contact the person who invited you.',
            summary: 'Applied topics',
            language: 'Language',
            count: '{{count}} topics available',
        },
    },
    fr: {
        proposal: {
            preview: 'Aperçu de conception · Données fictives, aucune modification',
            title: 'Vos thèmes de conseil',
            name: 'Nom affiché',
            choose: 'Choisir les thèmes',
            description: 'Recherchez un thème et vérifiez votre sélection avant de l’appliquer.',
            search: 'Rechercher des thèmes',
            selected: 'Sélectionnés ({{count}})',
            apply: 'Appliquer',
            cancel: 'Annuler',
            remove: 'Retirer {{name}}',
            locked: 'Obligatoire',
            lockedHint: 'Les thèmes obligatoires restent sélectionnés.',
            minimum: 'Choisissez au moins un thème.',
            single: 'Vous pouvez choisir exactement un thème de votre centre.',
            agencyOnly: 'Seuls les thèmes autorisés de votre centre sont disponibles.',
            catalogue: 'Choisissez parmi les thèmes autorisés du catalogue. Aucun thème n’est créé.',
            fixed: 'Ce thème est défini dans votre invitation.',
            fixtureIcons: 'Icônes du catalogue ORISO. Les identifiants sont des exemples.',
            noIcon: 'Aucune icône',
            noResults: 'Aucun thème correspondant.',
            clear: 'Effacer la recherche',
            loading: 'Chargement des thèmes…',
            error: 'Impossible de charger les thèmes.',
            retry: 'Réessayer',
            empty: 'Aucun thème autorisé. Contactez la personne qui vous a invité.',
            summary: 'Thèmes appliqués',
            language: 'Langue',
            count: '{{count}} thèmes disponibles',
        },
    },
    ru: {
        proposal: {
            preview: 'Макет · Пример данных, без изменений',
            title: 'Темы вашей консультации',
            name: 'Отображаемое имя',
            choose: 'Выбрать темы',
            description: 'Найдите тему и проверьте выбор перед применением.',
            search: 'Поиск тем',
            selected: 'Выбрано ({{count}})',
            apply: 'Применить',
            cancel: 'Отмена',
            remove: 'Удалить {{name}}',
            locked: 'Обязательная',
            lockedHint: 'Обязательные темы остаются выбранными.',
            minimum: 'Выберите хотя бы одну тему.',
            single: 'Вы можете выбрать ровно одну тему вашего центра.',
            agencyOnly: 'Доступны только разрешённые темы вашего центра.',
            catalogue: 'Выберите разрешённые темы каталога. Новые темы не создаются.',
            fixed: 'Эта тема указана в приглашении.',
            fixtureIcons: 'Значки из каталога ORISO. Идентификаторы приведены для примера.',
            noIcon: 'Нет значка',
            noResults: 'Подходящих тем нет.',
            clear: 'Очистить поиск',
            loading: 'Загрузка тем…',
            error: 'Не удалось загрузить темы.',
            retry: 'Повторить',
            empty: 'Нет разрешённых тем. Свяжитесь с отправителем приглашения.',
            summary: 'Применённые темы',
            language: 'Язык',
            count: 'Доступно тем: {{count}}',
        },
    },
    tr: {
        proposal: {
            preview: 'Tasarım önizlemesi · Örnek veriler, değişiklik yapılmaz',
            title: 'Danışmanlık konularınız',
            name: 'Görünen ad',
            choose: 'Konuları seç',
            description: 'Bir konu arayın ve uygulamadan önce seçiminizi kontrol edin.',
            search: 'Konu ara',
            selected: 'Seçilen ({{count}})',
            apply: 'Uygula',
            cancel: 'İptal',
            remove: '{{name}} konusunu kaldır',
            locked: 'Zorunlu',
            lockedHint: 'Zorunlu konular seçili kalır.',
            minimum: 'En az bir konu seçin.',
            single: 'Merkezinizin tam olarak bir konusunu seçebilirsiniz.',
            agencyOnly: 'Yalnızca merkezinizin izin verilen konuları seçilebilir.',
            catalogue: 'Kataloğun izin verilen konularını seçin. Yeni konu oluşturulmaz.',
            fixed: 'Bu konu davetiyenizde belirlenmiştir.',
            fixtureIcons: 'ORISO kataloğundan simgeler. Kimlikler örnektir.',
            noIcon: 'Simge yok',
            noResults: 'Eşleşen konu bulunamadı.',
            clear: 'Aramayı temizle',
            loading: 'Konular yükleniyor…',
            error: 'Konular yüklenemedi.',
            retry: 'Tekrar dene',
            empty: 'İzin verilen konu yok. Sizi davet eden kişiyle iletişime geçin.',
            summary: 'Uygulanan konular',
            language: 'Dil',
            count: '{{count}} konu mevcut',
        },
    },
    uk: {
        proposal: {
            preview: 'Макет дизайну · Приклад даних, без змін',
            title: 'Теми вашої консультації',
            name: 'Відображуване ім’я',
            choose: 'Вибрати теми',
            description: 'Знайдіть тему та перевірте вибір перед застосуванням.',
            search: 'Пошук тем',
            selected: 'Вибрано ({{count}})',
            apply: 'Застосувати',
            cancel: 'Скасувати',
            remove: 'Видалити {{name}}',
            locked: 'Обов’язкова',
            lockedHint: 'Обов’язкові теми залишаються вибраними.',
            minimum: 'Виберіть принаймні одну тему.',
            single: 'Ви можете вибрати рівно одну тему вашого центру.',
            agencyOnly: 'Доступні лише дозволені теми вашого центру.',
            catalogue: 'Виберіть дозволені теми каталогу. Нові теми не створюються.',
            fixed: 'Цю тему визначено у вашому запрошенні.',
            fixtureIcons: 'Піктограми з каталогу ORISO. Ідентифікатори наведено як приклад.',
            noIcon: 'Немає піктограми',
            noResults: 'Відповідних тем не знайдено.',
            clear: 'Очистити пошук',
            loading: 'Завантаження тем…',
            error: 'Не вдалося завантажити теми.',
            retry: 'Спробувати ще раз',
            empty: 'Немає дозволених тем. Зверніться до відправника запрошення.',
            summary: 'Застосовані теми',
            language: 'Мова',
            count: 'Доступно тем: {{count}}',
        },
    },
    ti: {
        proposal: {
            preview: 'ናይ ንድፊ ቅድመ ርእይቶ · ናይ ኣብነት ሓበሬታ፣ ለውጢ የለን',
            title: 'ናይ ምኽርኹም ኣርእስታት',
            name: 'ዝርአ ስም',
            choose: 'ኣርእስታት ምረጽ',
            description: 'ኣርእስቲ ድለን ቅድሚ ምትግባር ምርጫኻ ኣረጋግጽን።',
            search: 'ኣርእስቲ ድለ',
            selected: 'ዝተመርጹ ({{count}})',
            apply: 'ኣተግብር',
            cancel: 'ሰርዝ',
            remove: '{{name}} ኣውጽእ',
            locked: 'ግዴታ',
            lockedHint: 'ግዴታ ዝኾኑ ኣርእስታት ተመሪጾም ይተርፉ።',
            minimum: 'ብውሑዱ ሓደ ኣርእስቲ ምረጽ።',
            single: 'ካብ ማእከልኩም ሓደ ኣርእስቲ ጥራይ ክትመርጹ ትኽእሉ።',
            agencyOnly: 'ዝተፈቕዱ ናይ ማእከልኩም ኣርእስታት ጥራይ ይርከቡ።',
            catalogue: 'ካብ ዝተፈቕዱ ኣርእስታት ምረጽ። ሓድሽ ኣርእስቲ ኣይፍጠርን።',
            fixed: 'እዚ ኣርእስቲ ኣብ ዕድመኹም ተወሲኑ እዩ።',
            fixtureIcons: 'ምልክታት ካብ ካታሎግ ORISO። መለለዪታት ናይ ኣብነት እዮም።',
            noIcon: 'ምልክት የለን',
            noResults: 'ዝሰማማዕ ኣርእስቲ ኣይተረኽበን።',
            clear: 'ምድላይ ኣጽሪ',
            loading: 'ኣርእስታት ይጽዓኑ ኣለዉ…',
            error: 'ኣርእስታት ክጽዓኑ ኣይከኣሉን።',
            retry: 'እንደገና ፈትን',
            empty: 'ዝተፈቕደ ኣርእስቲ የለን። ምስ ዝዓደመኩም ሰብ ተራኸቡ።',
            summary: 'ዝተተግበሩ ኣርእስታት',
            language: 'ቋንቋ',
            count: '{{count}} ኣርእስታት ኣለዉ',
        },
    },
} satisfies Record<SupportedLanguageCode, { proposal: ProposalCopy }>;
