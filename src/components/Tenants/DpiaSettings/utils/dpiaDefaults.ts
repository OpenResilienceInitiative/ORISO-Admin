import { DPIA_SECTIONS, DpiaTextMap, hasDpiaText } from './dpiaSections';

/**
 * Pre-filled drafts for the operator-specific DSFA free-text slots.
 *
 * The editor must not open an empty TipTap document: each slot starts with a scaffold in the
 * right register — placeholders in square brackets, KDG norm with the DSGVO counterpart in
 * parentheses — that the operator overwrites. Keys are exactly the `id` values of
 * `DPIA_SECTIONS`; values are TipTap-compatible HTML as `DpiaTextGateway.save()` stores it.
 *
 * Every draft ends with a hint block (a blockquote — TipTap keeps blockquotes but strips a
 * `class` on `<p>`) that says what belongs in the slot and why the law requires it. It is to be
 * removed before publishing.
 *
 * A default is NOT operator text: `hasOperatorDpiaText()` treats it as unwritten, the container
 * strips untouched defaults back to empty before persisting, and a slot that was never edited
 * stays DRAFT. See `seedDpiaDefaults()` / `stripDpiaDefaults()`.
 *
 * Source of the wording: ORISO-Docs `oriso-platform/dsfa-text/vorlagen-betreiber.md`
 * (rendered at https://understand.oriso.org/dokumentation/legal/dsfa/vorlagen-betreiber/).
 * State: 2026-08-17.
 */
export const DSFA_EDITOR_DEFAULTS: DpiaTextMap = {
    governance: [
        '<p>Die Plattform wird von [Name des Verantwortlichen] gemeinsam mit [Bezeichnung des Verbundes bzw. der Kooperation] betrieben; sie ist ein Angebot an die angeschlossenen Träger und deren Beratungsstellen.</p>',
        '<p>Zentrales Steuerungsgremium ist [Name des Gremiums, z.&nbsp;B. Lenkungsausschuss], das sich aus [Zusammensetzung: Anzahl und entsendende Stellen] zusammensetzt und [Turnus, z.&nbsp;B. zweimal jährlich] tagt; es entscheidet über Zwecke und Mittel der Verarbeitung, über Grundsatzfragen und über das Budget.</p>',
        '<p>Die operative Geschäftsführung liegt bei [Stelle/Referat], die dem Gremium mindestens [Turnus] berichtet. Fachlich beraten wird das Gremium durch [weitere Gremien, z.&nbsp;B. Fachbeirat Datenschutz, Steuerkreis Technische Entwicklung], deren Aufgaben und Besetzung in [Verweis auf Kooperationsvereinbarung/Geschäftsordnung] geregelt sind.</p>',
        '<p>Träger und Beratungsstellen sind rechtlich selbstständige Organisationen; sie sind über [Entsendungs- oder Beteiligungsverfahren] in die Entscheidungsfindung eingebunden.</p>',
        '<blockquote><p><em>Hinweis (vor Veröffentlichung entfernen): Hier gehören Organisationsstruktur, Entscheidungsgremien, deren Zusammensetzung und Tagungsturnus sowie die Einbindung der Träger hinein. § 35 Abs. 7 KDG (Art. 35 Abs. 7 DSGVO) verlangt eine systematische Beschreibung der Verarbeitungsvorgänge und ihrer Zwecke — dazu gehört, wer über Zwecke und Mittel tatsächlich entscheidet. Ohne diese Beschreibung lässt sich die gemeinsame Verantwortlichkeit in Kapitel 5 nicht begründen.</em></p></blockquote>',
    ].join(''),

    accountability: [
        '<p>Verantwortlicher im Sinne des § 4 Nr. 9 KDG (Art. 4 Nr. 7 DSGVO) ist [Name, Rechtsform, Anschrift].</p>',
        '<p>Die Verarbeitung erfolgt in gemeinsamer Verantwortlichkeit nach § 28 Abs. 1 KDG (Art. 26 DSGVO) mit [Aufzählung: Träger, Kooperationspartner]; eine Vereinbarung über die gemeinsame Verantwortlichkeit nach § 28 Abs. 1 S. 2 KDG (Art. 26 Abs. 1 S. 2 DSGVO) besteht seit [Datum] und regelt in ihren Anlagen [Nummern] die Zuteilung der Pflichten, insbesondere die Erfüllung der Betroffenenrechte und der Informationspflichten.</p>',
        '<p>Die Träger bleiben für die fachliche Beratung einschließlich der Falldokumentation außerhalb der Plattform verantwortlich.</p>',
        '<p>Als Auftragsverarbeiter nach § 29 KDG (Art. 28 DSGVO) sind eingebunden: [Name des Hosting-Betreibers] für Betrieb und Hosting der Produktivumgebung sowie [Name des Entwicklungs-/Supportdienstleisters] für Entwicklung, Wartung und Support; mit beiden bestehen Auftragsverarbeitungsvereinbarungen, der Verarbeitungsort ist [Land].</p>',
        '<p>Die Datenschutzbeauftragung nimmt [Name, Organisation, Kontakt] wahr; zuständige Aufsicht ist [Name und Anschrift der Aufsichtsbehörde].</p>',
        '<blockquote><p><em>Hinweis (vor Veröffentlichung entfernen): Zu benennen sind der Verantwortliche, die gemeinsame Verantwortlichkeit samt Vereinbarung und Pflichtenzuteilung, sämtliche Auftragsverarbeiter mit Verarbeitungsort und AVV-Status, die Datenschutzbeauftragung und die zuständige Aufsicht. § 28 KDG (Art. 26 DSGVO) verlangt eine transparente Festlegung, wer welche Pflicht erfüllt; § 29 KDG (Art. 28 DSGVO) verlangt den Nachweis der Auftragsverarbeitung. Etwaige Unterauftragsverarbeiter des Hosting-Betreibers sind mit aufzunehmen.</em></p></blockquote>',
    ].join(''),

    identityCheck: [
        '<p>Vor der Bearbeitung eines Betroffenenantrags ist die Identität der antragstellenden Person zu überprüfen. Beim Plattformbetreiber ist diese Prüfung <strong>beinahe unmöglich</strong>: Die Plattform kennt weder Klarnamen noch verifizierte Kontaktdaten, sondern lediglich ein systemgeneriertes Pseudonym und gegebenenfalls eine freiwillig hinterlegte, nicht verifizierte E-Mail-Adresse.</p>',
        '<p>Der Betreiber ermittelt daher die zuständige Beratungsstelle und bittet diese um die Prüfung; die Beratungsstelle gleicht die vorliegenden Angaben mit dem ihr bekannten Beratungsverlauf ab und bestätigt die Zuordnung über [Kanal, z.&nbsp;B. Rückmeldung im Beratungschat]. Ergänzend kommen in Betracht: [weitere Legitimationsmittel, z.&nbsp;B. Rückbestätigung über die hinterlegte E-Mail-Adresse, Nennung fallbezogener Merkmale].</p>',
        '<p>Bestehen begründete Zweifel an der Identität, werden nach § 17 Abs. 3 KDG (Art. 12 Abs. 6 DSGVO) zusätzliche Informationen angefordert; kann die Identität nicht festgestellt werden, wird der Antrag mit Begründung abgelehnt. Zuständig für die Durchführung ist [Stelle/Funktion], Bearbeitungsfrist ist [Frist].</p>',
        '<blockquote><p><em>Hinweis (vor Veröffentlichung entfernen): Beschreiben Sie das konkrete Verfahren, die beteiligten Stellen und die Fristen. Das Gesetz verlangt die Prüfung, weil eine Auskunft an die falsche Person selbst eine unbefugte Offenlegung wäre — bei einer bewusst anonym nutzbaren Beratungsplattform ist die ehrliche Benennung der Grenzen wichtiger als ein formal wirkendes Verfahren, das die Identität in Wahrheit nicht feststellen kann.</em></p></blockquote>',
    ].join(''),

    informationChannels: [
        '<p>Die Datenschutzhinweise nach §§ 15 und 16 KDG (Art. 13 und 14 DSGVO) sind vor der Registrierung auf der Registrierungsseite sowie nach der Anmeldung dauerhaft in der Anwendung verlinkt; für den registrierungsfreien Live-Chat werden sie auf der vorgeschalteten Einstiegsseite angezeigt.</p>',
        '<p>Impressum, Datenschutzerklärung und Einwilligungstext bestehen auf jeder Ebene der Plattform; pflegt eine Beratungsstelle keine eigene Fassung, gilt die des Trägers, andernfalls die Plattform-Vorlage — Ratsuchende sehen damit stets einen vollständigen Satz Rechtstexte.</p>',
        '<p>Über <strong>ihre eigene</strong> Verarbeitung — insbesondere die Falldokumentation außerhalb der Plattform — informieren die Beratungsstellen selbst, und zwar über [Kanal, z.&nbsp;B. Hinweis im Beratungschat, Dokument-Upload, Verlinkung der eigenen Datenschutzerklärung].</p>',
        '<p>Änderungen der Datenschutzhinweise werden [Verfahren, z.&nbsp;B. über einen Hinweis beim nächsten Anmelden] bekannt gemacht. Für Rückfragen steht [Kontaktkanal] zur Verfügung.</p>',
        '<blockquote><p><em>Hinweis (vor Veröffentlichung entfernen): Anzugeben sind die konkreten Kanäle, über die Ratsuchende und Beratende informiert werden, sowie die Arbeitsteilung zwischen Plattform und Beratungsstelle. §§ 15 f. KDG (Art. 13 f. DSGVO) verlangen die Information zum Zeitpunkt der Erhebung — bei mehreren Verantwortlichen muss erkennbar sein, wer worüber informiert. Für den Bulk-Import einzuladender Beratender greift zusätzlich die Informationspflicht bei Erhebung bei Dritten (§ 16 KDG / Art. 14 DSGVO).</em></p></blockquote>',
    ].join(''),

    escalationChain: [
        '<p>Für den Fall, dass im Beratungsverlauf eine anzeigepflichtige Straftat angekündigt oder eine akute Gefährdung erkennbar wird („Worst-Case-Fall"), besteht eine gemeinsam erarbeitete Handlungsempfehlung mit folgender Verantwortungskette:</p>',
        '<ol>',
        '<li>Die beratende Person informiert unverzüglich [Leitung der Beratungsstelle].</li>',
        '<li>Es erfolgt eine fachliche Gefährdungseinschätzung durch [Funktion], erforderlichenfalls unter Hinzuziehung von [Fachdienst].</li>',
        '<li>Liegen die Voraussetzungen des § 138 StGB oder eine Kindeswohlgefährdung vor, leitet <strong>die Beratungsstelle</strong> — nicht der Plattformbetreiber — die erforderlichen Angaben an [Polizei / Jugendamt] weiter.</li>',
        '<li>Parallel werden [Referatsleitung, Datenschutzbeauftragung, Trägervertretung] informiert.</li>',
        '</ol>',
        '<p>Weitergegeben werden können ausschließlich der von der beratenden Person eingesehene Nachrichteninhalt, der systemseitig vermerkte Zeitpunkt und die Anschrift des Auftragsverarbeiters. <strong>IP-Adressen der Ratsuchenden werden in den Fachdatenbeständen nicht geführt und können daher nicht herausgegeben werden</strong>; Beratungsinhalte liegen dem Plattformbetreiber wegen der Ende-zu-Ende-Verschlüsselung nicht im Klartext vor.</p>',
        '<p>Für Datenschutzvorfälle nach § 33 KDG (Art. 33 DSGVO) gilt gesondert: Meldung an [Aufsicht] binnen 72 Stunden über [Meldeweg], interne Alarmierung von [Funktionen] binnen [Frist], Vertretung durch [Funktion].</p>',
        '<blockquote><p><em>Hinweis (vor Veröffentlichung entfernen): Hier gehören zwei Ketten hinein, die oft verwechselt werden — die fachliche Eskalation bei Gefahr für Leib und Leben und die datenschutzrechtliche Meldekette bei einer Verletzung des Schutzes personenbezogener Daten. Nennen Sie Funktionen, Reihenfolge, Fristen und Vertretungen. § 33 KDG (Art. 33 DSGVO) setzt eine 72-Stunden-Frist; ohne benannte Vertretungen ist sie im Urlaubs- oder Krankheitsfall nicht einzuhalten.</em></p></blockquote>',
    ].join(''),

    proportionalityPurpose: [
        '<p>Die Verarbeitung verfolgt den Zweck, ratsuchenden Menschen eine niedrigschwellige, vertrauliche und ortsunabhängige Beratung zu ermöglichen. [Name des Verantwortlichen] nimmt damit seinen [satzungsmäßigen / gesetzlichen / kirchlichen] Auftrag wahr, Menschen in Not- und Konfliktlagen zu unterstützen; Grundlage ist [Verweis auf Leitbild, Satzung oder gesetzlichen Auftrag].</p>',
        '<p>Der Zweck ist legitim, weil er dem Abbau von Zugangsbarrieren dient: Erreicht werden insbesondere Personen, die eine Beratungsstelle aus Scham, aus Mobilitätsgründen, wegen zeitlicher Zwänge oder aus Angst vor Stigmatisierung nicht aufsuchen würden.</p>',
        '<p>Ergänzend verfolgt die Verarbeitung das Ziel, die Beratung digital in der Qualität und Vertraulichkeit anzubieten, die auch für die Beratung vor Ort gilt.</p>',
        '<blockquote><p><em>Hinweis (vor Veröffentlichung entfernen): Stufe 1 der Vier-Stufen-Prüfung. Benennen Sie den Zweck aus Ihrem eigenen Auftrag heraus und belegen Sie ihn mit Ihrer Rechts- oder Satzungsgrundlage. Die Verhältnismäßigkeitsprüfung nach § 35 Abs. 7 lit. b KDG (Art. 35 Abs. 7 lit. b DSGVO) beginnt hier: Ohne legitimen Zweck lässt sich keine der folgenden Stufen begründen.</em></p></blockquote>',
    ].join(''),

    proportionalitySuitability: [
        '<p>Die Verarbeitung ist zur Erreichung des Zwecks geeignet. Eine zentrale, unter einem eingeführten Namen auffindbare und pseudonym nutzbare Plattform erreicht nachweislich Personen, die andernfalls keine Hilfe in Anspruch nähmen; dies belegen [Kennzahlen, z.&nbsp;B. Anzahl der Erstanfragen, Anteil anonymer Erstkontakte, Erhebung/Evaluation vom [Datum]].</p>',
        '<p>Die eingesetzten technischen Verfahren sind geeignet, die zugesagte Vertraulichkeit tatsächlich herzustellen: Beratungsinhalte werden Ende-zu-Ende-verschlüsselt übertragen und gespeichert, sodass sie weder dem Betreiber noch seinen Dienstleistern zugänglich sind.</p>',
        '<p>Die einheitliche Plattform ermöglicht zudem ein gemeinsames Qualitäts-, Sicherheits- und Fortbildungsniveau, das einzelne Träger jeweils für sich nicht erreichen könnten.</p>',
        '<blockquote><p><em>Hinweis (vor Veröffentlichung entfernen): Stufe 2. Geeignetheit heißt: Der Zweck wird durch die Verarbeitung tatsächlich gefördert — nicht: sie ist die beste Lösung. Belegen Sie das möglichst mit eigenen Zahlen oder einer Evaluation; eine bloße Behauptung trägt die Abwägung nicht.</em></p></blockquote>',
    ].join(''),

    proportionalityNecessity: [
        '<p>Ein milderes, gleich geeignetes Mittel steht nicht zur Verfügung. Geprüft und verworfen wurden:</p>',
        '<ol>',
        '<li>der Verzicht auf jede Registrierung — er würde eine kontinuierliche, über mehrere Kontakte hinweg getragene Beratung und den Aufbau eines Vertrauensverhältnisses unmöglich machen; für den Erstkontakt bleibt der registrierungsfreie Live-Chat als mildere Variante erhalten;</li>',
        '<li>dezentrale Einzellösungen der Träger — sie fragmentieren das Angebot, überfordern kleinere Träger technisch und finanziell und schwächen die Auffindbarkeit für Ratsuchende erheblich;</li>',
        '<li>[weitere geprüfte Alternative, z.&nbsp;B. reine Telefon- oder Vor-Ort-Beratung] — [Begründung der Verwerfung].</li>',
        '</ol>',
        '<p>Der Umfang der erhobenen Daten ist auf das Erforderliche begrenzt: Pflichtangabe ist allein die Postleitzahl zur Zuordnung der zuständigen Beratungsstelle; der Benutzername wird systemseitig erzeugt, alle weiteren Angaben sind freiwillig.</p>',
        '<blockquote><p><em>Hinweis (vor Veröffentlichung entfernen): Stufe 3. Entscheidend ist, dass Sie Alternativen tatsächlich geprüft und die Verwerfung begründet haben — die Aufsicht fragt danach. Nennen Sie mindestens zwei geprüfte Alternativen und je einen konkreten Grund, warum sie den Zweck nicht gleich gut erreichen.</em></p></blockquote>',
    ].join(''),

    proportionalityBalance: [
        '<p>Die Interessenabwägung fällt zugunsten der Verarbeitung aus. Für die Betroffenen streiten die Sensibilität der Beratungsinhalte und die besondere Schutzbedürftigkeit eines Teils der Ratsuchenden; für die Verarbeitung streiten der Nutzen des Angebots und die Tiefe der ergriffenen Schutzmaßnahmen. Maßgeblich sind vier Gesichtspunkte:</p>',
        '<ol>',
        '<li><strong>Freiwilligkeit</strong> — die Nutzung, die Registrierung und sämtliche Zusatzangaben sind freiwillig, ein Widerruf ist jederzeit und unmittelbar wirksam;</li>',
        '<li><strong>Datenminimierung</strong> — der Benutzername wird systemseitig erzeugt, Pflichtangabe ist allein die Postleitzahl, es findet weder Tracking noch Profilbildung noch Werbung statt;</li>',
        '<li><strong>begrenzte Verarbeitungstätigkeiten</strong> — der Betreiber wertet Beratungsdaten nicht aus, Statistiken sind aggregiert und mit einer Kleinstzellen-Unterdrückung versehen;</li>',
        '<li><strong>umfangreiche technische und organisatorische Maßnahmen</strong> — insbesondere die durchgängige Ende-zu-Ende-Verschlüsselung aller Beratungsformen, die Selbstlöschung von Nachrichten und Konten, die verpflichtende Zwei-Faktor-Authentisierung der Beratenden und das protokollierte Übergabeverfahren.</li>',
        '</ol>',
        '<p>Die verbleibenden Risiken und die ihnen zugeordneten Maßnahmen sind in der Risikoanalyse (Anlage 1) im Einzelnen ausgewiesen; als noch nicht abschließend behandelt gelten [Aufzählung der aus Kapitel 10 übernommenen offenen Punkte].</p>',
        '<blockquote><p><em>Hinweis (vor Veröffentlichung entfernen): Stufe 4 und die eigentliche Abwägung. Benennen Sie zuerst, was gegen die Verarbeitung spricht, und erst danach die kompensierenden Maßnahmen — eine Abwägung, die nur eine Seite nennt, ist keine. Übernehmen Sie die offenen Punkte aus Kapitel 10 wörtlich; die Angemessenheit steht und fällt mit ihrer Abarbeitung.</em></p></blockquote>',
    ].join(''),

    resultParagraph: [
        '<p>Drei der zehn Prüffragen sind zu bejahen; die Schwelle ist damit überschritten und eine Datenschutz-Folgenabschätzung ist durchzuführen.</p>',
        '<p>Tragend sind die zu erwartenden besonderen Kategorien personenbezogener Daten nach § 11 KDG (Art. 9 DSGVO), der große Umfang der Verarbeitung — zum Stichtag [Datum] [Zahl] registrierte Ratsuchende in [Zahl] Beratungsstellen — sowie das Zusammenwirken mehrerer Verantwortlicher bei einem teilweise besonders schutzbedürftigen Personenkreis. [Ergänzende Bewertung des Verantwortlichen, z.&nbsp;B. zur Risikoeinstufung oder zu Besonderheiten einzelner Fachbereiche.]</p>',
        '<p>Die vorliegende DSFA setzt diese Pflicht um; ihr Ergebnis ist in Kapitel 10 festgehalten.</p>',
        '<blockquote><p><em>Hinweis (vor Veröffentlichung entfernen): Ergänzen Sie die eigenen Kennzahlen mit Stichtag und Ihre Bewertung. § 35 Abs. 1 KDG (Art. 35 Abs. 1 DSGVO) verlangt die Prognose eines voraussichtlich hohen Risikos — die Begründung sollte auf Ihre konkrete Größenordnung und Ihren Angebotszuschnitt Bezug nehmen, nicht nur auf die abstrakten Prüffragen.</em></p></blockquote>',
    ].join(''),

    annexIndex: [
        '<p>Zu dieser Datenschutz-Folgenabschätzung gehören:</p>',
        '<ul>',
        '<li><strong>Anlage 1 — Risikoanalyse</strong>: Risiko-/Maßnahmen-Matrix mit stabilen Kennungen je Risiko und Maßnahme, Stand [Datum].</li>',
        '<li><strong>Anlage 2 — Löschkonzept</strong>: Aufbewahrungs- und Löschfristen je Datenkategorie einschließlich Protokoll- und Sicherungsdaten, Stand [Datum].</li>',
        '<li><strong>Anlage 3 — Vereinbarung über die gemeinsame Verantwortlichkeit</strong> nach § 28 Abs. 1 S. 2 KDG (Art. 26 DSGVO) mit ihren Anlagen [Nummern].</li>',
        '<li><strong>Anlage 4 — Auftragsverarbeitungsvereinbarungen</strong> mit [Hosting-Betreiber] und [Entwicklungsdienstleister].</li>',
        '<li><strong>Anlage 5 — Verzeichnis der Verarbeitungstätigkeiten</strong> nach § 31 KDG (Art. 30 DSGVO), Auszug.</li>',
        '<li><strong>Anlage 6 — [Handlungsempfehlung Worst-Case-Fall / weitere Anlage]</strong>.</li>',
        '</ul>',
        '<p>Jede Anlage wird eigenständig versioniert; maßgeblich ist der jeweils im Dokumentkopf ausgewiesene Stand.</p>',
        '<blockquote><p><em>Hinweis (vor Veröffentlichung entfernen): Führen Sie hier alle mitgeltenden Dokumente mit Stand auf. Anlage 1 und Anlage 2 sind nicht optional: Ohne Risikoanalyse ist das Ergebnis der DSFA nach § 35 Abs. 7 lit. d KDG (Art. 35 Abs. 7 lit. d DSGVO) unvollständig, und ohne Löschkonzept fehlen die Fristen, auf die die Kapitel 6 und 8 durchgängig verweisen.</em></p></blockquote>',
    ].join(''),
};

/**
 * Fingerprint that ignores only what TipTap is known to change when it re-serialises the very
 * same document — attributes (e.g. a class on a blockquote), tag-name case, whitespace between
 * tags, and raw no-break spaces vs `&nbsp;` — while keeping the element structure and inline
 * marks. A formatting-only edit (a list, emphasis, a link, a heading) therefore changes the
 * fingerprint and counts as operator text; only an untouched draft matches its default.
 */
const fingerprint = (html: string): string =>
    html
        // <tag attr="…"> -> <tag>, </tag> stays; tag names lower-cased
        .replace(
            /<\s*(\/?)\s*([a-zA-Z][\w-]*)[^>]*>/g,
            (_m, slash: string, tag: string) => `<${slash}${tag.toLowerCase()}>`,
        )
        .replace(/\u00a0|\u202f|&nbsp;/g, ' ')
        // whitespace between tags is layout, whitespace inside text is content (collapsed)
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .trim();

/** True when `html` is (still) the untouched default draft of the slot. */
export const isDpiaDefaultText = (sectionId: string, html: string | undefined): boolean => {
    const fallback = DSFA_EDITOR_DEFAULTS[sectionId];
    if (!fallback || !html) return false;
    return fingerprint(html) === fingerprint(fallback);
};

/** True when the slot carries text the operator actually wrote (not empty, not the default). */
export const hasOperatorDpiaText = (sectionId: string, html: string | undefined): boolean =>
    hasDpiaText(html) && !isDpiaDefaultText(sectionId, html);

/** Fills every slot that has no operator text with its default draft; stored text always wins. */
export const seedDpiaDefaults = (texts: DpiaTextMap): DpiaTextMap => {
    const seeded: DpiaTextMap = { ...texts };
    DPIA_SECTIONS.forEach(({ id }) => {
        if (!hasDpiaText(seeded[id]) && DSFA_EDITOR_DEFAULTS[id]) seeded[id] = DSFA_EDITOR_DEFAULTS[id];
    });
    return seeded;
};

/** Inverse of `seedDpiaDefaults` for persistence: an untouched default is stored as empty, not as text. */
export const stripDpiaDefaults = (texts: DpiaTextMap): DpiaTextMap =>
    Object.fromEntries(Object.entries(texts).map(([id, html]) => [id, isDpiaDefaultText(id, html) ? '' : html]));
