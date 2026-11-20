export type ProposalLocale = 'de' | 'en';
export type CopyBlock = 'address' | 'contact' | 'hours' | 'topics';

export interface CentreFields {
    name: string;
    postcode: string;
    city: string;
    street: string;
    houseNumber: string;
    floorBuilding: string;
    country: string;
    phone: string;
    phoneSecondary: string;
    email: string;
    openingHours: string;
    description: string;
}

export interface SavedCentre extends CentreFields {
    topicIds: number[];
}

export const firstCentre: SavedCentre = {
    name: 'Beratung Mitte',
    postcode: '10115',
    city: 'Berlin',
    street: 'Beispielstraße',
    houseNumber: '12',
    floorBuilding: '2. OG',
    country: 'Deutschland',
    phone: '+49 30 123456',
    phoneSecondary: '',
    email: 'kontakt@example.org',
    openingHours: 'Mo–Fr 09:00–16:00',
    description: '',
    topicIds: [1],
};

export const emptyFields: CentreFields = {
    name: '',
    postcode: '',
    city: '',
    street: '',
    houseNumber: '',
    floorBuilding: '',
    country: '',
    phone: '',
    phoneSecondary: '',
    email: '',
    openingHours: '',
    description: '',
};

export const copyFields: Record<Exclude<CopyBlock, 'topics'>, Array<keyof CentreFields>> = {
    address: ['postcode', 'city', 'street', 'houseNumber', 'floorBuilding', 'country'],
    contact: ['phone', 'phoneSecondary', 'email'],
    hours: ['openingHours'],
};

// Existing catalogue IDs are illustrative fixtures; no icon/catalogue contract is introduced.
export const proposalTopics = [
    { id: 1, de: 'Allgemeine Sozialberatung', en: 'General social counselling' },
    { id: 2, de: 'Eltern und Familie', en: 'Parents and family' },
    { id: 3, de: 'Rechtliche Betreuung und Vorsorge', en: 'Legal guardianship and advance directives' },
];

export const copy: Record<ProposalLocale, Record<string, string>> = {
    de: {
        preview: 'Designvorschlag · nur Beispieldaten',
        notice: 'Hier werden keine Konten, Berechtigungen oder Beratungsstellen verändert.',
        title: 'Ihre Beratungsstellen einrichten',
        intro: 'Erst eine Beratungsstelle fertig einrichten. Danach entscheiden Sie, ob Sie weitere hinzufügen möchten.',
        inviter: 'Einladende Person · Träger-Admin (Simulation)',
        carrier: 'Beispiel-Träger · eigener Träger',
        grant: 'Weitere Beratungsstellen im eigenen Träger erlauben',
        grantHint:
            'Option der Einladung. Diese Vorschau zeigt beide Möglichkeiten; sie erteilt keine echte Berechtigung.',
        secure: 'Passwort eingerichtet · Zweiter Faktor aktiv',
        firstHint:
            'Die erste Beratungsstelle wurde bei der Registrierung bereits angelegt. Jetzt ergänzen Sie dieselbe Beratungsstelle.',
        stepForm: 'Einrichten',
        stepSaved: 'Gespeichert',
        stepFinish: 'Abschließen',
        centre: 'Beratungsstelle',
        formTitle: 'Allgemeine Informationen',
        formHint: 'Name, Adresse und Kontakt. Alle vorbefüllten Angaben können Sie ändern.',
        topics: 'Themenfelder',
        topicsHint:
            'Ein oder mehrere erlaubte Themen. Die Anzahl der Themen bestimmt nicht die Anzahl der Beratungsstellen.',
        singleHint: 'In diesem Beispiel ist genau ein Thema erlaubt.',
        topicRequired: 'Wählen Sie mindestens ein erlaubtes Thema.',
        save: 'Beratungsstelle speichern',
        saved: 'Beratungsstelle gespeichert',
        savedHint: 'Möchten Sie noch eine Beratungsstelle im selben Träger einrichten?',
        another: 'Weitere Beratungsstelle',
        finish: 'Einrichtung abschließen',
        noGrant:
            'Sie können diese Beratungsstelle fertig einrichten. Weitere Beratungsstellen benötigen die zusätzliche Erlaubnis.',
        copyTitle: 'Was möchten Sie übernehmen?',
        copyHint:
            'Wählen Sie Angaben aus der zuletzt gespeicherten Beratungsstelle. Im nächsten Formular bleibt alles änderbar.',
        address: 'Adresse',
        addressDetail: 'PLZ, Stadt, Straße, Hausnummer, Etage und Land',
        contact: 'Kontaktdaten · Vorschlag',
        contactDetail: 'Telefon, weitere Telefonnummer und E-Mail',
        hours: 'Öffnungszeiten · Vorschlag',
        hoursDetail: 'Die eingetragenen Zeitangaben',
        topicsCopy: 'Themenfelder · Vorschlag',
        topicsDetail: 'Nur Themen, die auch für die nächste Beratungsstelle erlaubt sind',
        review: 'Adresse ist bestätigt. Die weiteren Blöcke und der Start ohne Auswahl sind Vorschläge für die Designprüfung.',
        copyApply: 'Auswahl übernehmen',
        cancel: 'Abbrechen',
        copied: 'Vorbefüllte Angaben sind änderbar. Nicht ausgewählte Angaben bleiben leer.',
        error: 'Speichern hat in diesem Beispiel nicht geklappt. Ihre Eingaben bleiben erhalten. Bitte erneut speichern.',
        denied: 'Die zusätzliche Erlaubnis ist nicht mehr verfügbar. Bereits gespeicherte Beratungsstellen bleiben erhalten.',
        done: 'Ihre Beratungsstellen sind eingerichtet',
        doneHint:
            'Im Produkt finden Sie Ihre Beratungsstellen danach im Adminbereich. Der bestehende Editor bleibt für Änderungen verfügbar.',
        savedList: 'Gespeicherte Beratungsstellen (Simulation)',
        count: 'gespeichert',
        next: 'Weiteres Formular',
        source: 'Ausgangsdaten bleiben unverändert.',
        noCopy: 'Keine Angaben vorausgewählt',
        return: 'Zur gespeicherten Beratungsstelle',
    },
    en: {
        preview: 'Design proposal · example data only',
        notice: 'This preview does not change accounts, permissions or counselling centres.',
        title: 'Set up your counselling centres',
        intro: 'Complete your first centre. Then choose whether to add more.',
        inviter: 'Inviting person · carrier administrator (simulation)',
        carrier: 'Example carrier · your own carrier',
        grant: 'Allow additional counselling centres within the same carrier',
        grantHint: 'An invitation option. This preview shows both choices; it grants no real permission.',
        secure: 'Password set · Second factor active',
        firstHint: 'Registration has already created the first centre. You are completing that same centre now.',
        stepForm: 'Set up',
        stepSaved: 'Saved',
        stepFinish: 'Finish',
        centre: 'Counselling centre',
        formTitle: 'General information',
        formHint: 'Name, address and contact details. You can edit every prefilled value.',
        topics: 'Focus topics',
        topicsHint: 'One or several permitted topics. Topic count does not determine how many centres you can create.',
        singleHint: 'This example permits exactly one topic.',
        topicRequired: 'Choose at least one permitted topic.',
        save: 'Save counselling centre',
        saved: 'Counselling centre saved',
        savedHint: 'Would you like to set up another centre within the same carrier?',
        another: 'Add another centre',
        finish: 'Finish setup',
        noGrant: 'You can complete this centre. Additional centres require the extra permission.',
        copyTitle: 'What would you like to reuse?',
        copyHint: 'Choose information from the last saved centre. Everything remains editable in the next form.',
        address: 'Address',
        addressDetail: 'Postal code, city, street, house number, floor and country',
        contact: 'Contact details · proposal',
        contactDetail: 'Phone, secondary phone and email',
        hours: 'Opening hours · proposal',
        hoursDetail: 'The opening hours entered',
        topicsCopy: 'Focus topics · proposal',
        topicsDetail: 'Only topics that are also permitted for the next centre',
        review: 'Address reuse is confirmed. Other blocks and starting with no selection are proposals for design review.',
        copyApply: 'Use selected information',
        cancel: 'Cancel',
        copied: 'Prefilled details are editable. Unselected information stays empty.',
        error: 'Saving failed in this example. Your entries are still here. Please save again.',
        denied: 'The additional permission is no longer available. Previously saved centres are retained.',
        done: 'Your counselling centres are ready',
        doneHint:
            'In the product, your centres will appear in the admin area. The existing editor remains available for changes.',
        savedList: 'Saved counselling centres (simulation)',
        count: 'saved',
        next: 'Next form',
        source: 'The source details stay unchanged.',
        noCopy: 'No information selected by default',
        return: 'Back to the saved centre',
    },
};
