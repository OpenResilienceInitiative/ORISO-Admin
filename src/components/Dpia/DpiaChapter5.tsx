/* Structural port of the issue-named dsfa-page-v2.html; provenance in __fixtures__/README.md. */
import type { DpiaChapterProps } from './DpiaChapterShared';
import { DpiaIcon } from './DpiaIcon';
import { COUNSELLING_TYPES, TECHNICAL_MEASURES, NORMS } from './dpiaContent';
import { DpiaNorm, DpiaTableScroll } from './DpiaChapterShared';
import styles from './styles.module.scss';
import { EvidenceButton } from './DpiaEvidenceDialog';

export const DpiaChapter5 = ({ showInternalNotes, preset }: DpiaChapterProps) => (
    <section id="kap5" aria-labelledby="kap5-title" className={styles.section}>
        <span className={styles.chapterNo}>Kapitel 5</span>
        <h2 id="kap5-title">Verfahren und Technik</h2>
        <h3>5.1 Zweck</h3>
        <p>
            Zweck der Verarbeitung ist die Bereitstellung und der Betrieb einer Online-Beratungsplattform.
            Beratungsinhalte werden Ende-zu-Ende-verschlüsselt übertragen und gespeichert; Betreiber und Dienstleister
            können sie technisch nicht einsehen (im Einzelnen: Abschnitt 5.3).
        </p>
        <p>
            Rechtsgrundlage der Inhaltsverarbeitung ist die ausdrückliche Einwilligung (
            <DpiaNorm preset={preset} {...NORMS.consent} />
            ).
        </p>
        <h3>5.2 Beratungsarten</h3>
        <div className={styles.typeGrid}>
            {COUNSELLING_TYPES.map((type) => (
                <div key={type.id} className={[styles.typeCard, type.planned ? styles.typeCardPlanned : ''].join(' ')}>
                    <DpiaIcon name={type.icon} size="24px" />
                    <h4>
                        {type.title}
                        {type.planned && <span className={styles.plannedBadge}>in Planung</span>}
                    </h4>
                    <p>
                        {type.description}
                        {type.id === 'video' && <EvidenceButton evidenceKey="livekit" />}
                    </p>
                </div>
            ))}
        </div>
        <div className={styles.planBox}>
            <div className={styles.planTitle}> Termine — in Planung, noch nicht ausgeliefert</div>
            <p>
                Eine Terminverwaltung (Kalender-/Buchungsmodul) ist{' '}
                <strong>nicht Bestandteil des aktuellen Leistungsumfangs</strong>. ADR-020 („Scheduled calls, secure
                invitations, and a unified contact calendar“, Status <em>Accepted</em> vom 12.08.2026) beschreibt den
                geplanten Zuschnitt: Termin, Call-Session und Call-Einladung werden getrennt; der Zugang zu einem Anruf
                ist eine Träger-Richtlinie, die der Server durchsetzt (Voreinstellung: nur registrierte Teilnehmende).
                Eingeladene erhalten Mitgliedschaft ausschließlich im Anrufraum, nie im Beratungsfall. Diese DSFA
                bewertet die geplante Funktion noch nicht — sie wird bei Auslieferung ergänzt.
            </p>
        </div>
        {showInternalNotes && (
            <div className={styles.internalNote}>
                <span className={styles.internalTag}>Intern · Gap</span> Das Vorgängersystem hatte ein Terminmodul
                (appointmentService + cal.com). ORISO deployt keins (
                <code>FEATURE_APPOINTMENT_ENABLED: &quot;false&quot;</code>, kein Helm-Template; nur tote Fork-Reste).
                Entscheidung „dauerhaft entfallen vs. geplant&quot; vor DSFA-Finalisierung festhalten (fehlende ADR).{' '}
            </div>
        )}
        <h3>5.3 Ende-zu-Ende-Verschlüsselung (Schichtenmodell)</h3>
        <div className={styles.measures}>
            {TECHNICAL_MEASURES.map((measure) => (
                <span key={measure.label} className={styles.measure}>
                    <DpiaIcon name={measure.icon} size="13px" />
                    {measure.label}
                </span>
            ))}
        </div>
        <p>
            Die Plattform basiert auf dem offenen Kommunikationsprotokoll <strong>Matrix</strong>. Nachrichteninhalte
            werden auf dem Endgerät erstellt und Ende-zu-Ende verschlüsselt versendet (Verfahren Olm für Einzel-, Megolm
            für Gruppenkommunikation
            <EvidenceButton evidenceKey="megolm" />
            ); auf dem Server liegen Inhalte ausschließlich verschlüsselt. Die zur Entschlüsselung nötigen Schlüssel
            werden nur zwischen den Endgeräten der berechtigten Raumteilnehmer geteilt. Ergänzend ist jede Verbindung
            transportverschlüsselt (TLS). Die eingesetzte Verschlüsselungs­implementierung (vodozemac) wurde extern
            auditiert.
            <EvidenceButton evidenceKey="vodozemac" />
        </p>
        <p>
            Alle Beratungsräume werden serverseitig verpflichtend mit aktivierter Ende-zu-Ende-Verschlüsselung angelegt;
            ein unverschlüsselter Sendepfad existiert nicht.
            <EvidenceButton evidenceKey="e2ee-enforced" /> Dateianhänge werden zusätzlich clientseitig mit einem
            einmaligen AES-256-Schlüssel verschlüsselt, bevor sie das Endgerät verlassen; der Server erhält weder
            Dateinamen noch Inhaltstyp, sondern nur einen nicht entschlüsselbaren Datenblock.
            <EvidenceButton evidenceKey="attachment" /> Eine Föderation mit fremden Matrix-Servern ist bewusst
            deaktiviert: Es verlassen keine Daten den Homeserver der Plattform.
            <EvidenceButton evidenceKey="federation" />
        </p>
        <p>
            Zur Wiederherstellung nach Geräteverlust wird ein serverseitiges, seinerseits verschlüsseltes
            Schlüssel-Backup geführt (Secret Storage mit Wiederherstellungsschlüssel beim Nutzer); der Server kann die
            gesicherten Schlüssel nicht lesen.
        </p>
        <p>
            <strong>Ehrliche Abgrenzung.</strong> Innerhalb einer Beratungsstelle ist die maßgebliche
            Vertraulichkeitsgrenze nicht die Verschlüsselung, sondern die anwendungsseitige Zugriffskontrolle
            (Sichtbarkeits- und Berechtigungssteuerung mit protokolliertem Übergabeverfahren, Abschnitt 5.7); der
            Plattformbetrieb verfügt zudem über administrative Serverfunktionen. Ein kryptografischer Ausschluss jeder
            denkbaren Betreiberhandlung wird daher nicht zugesichert; zugesichert wird, dass Beratungsinhalte den Server
            ausschließlich verschlüsselt erreichen und verlassen.
        </p>
        <p>
            <strong>Verbesserung gegenüber dem Vorgängersystem.</strong> Im Vorgängersystem (Rocket.Chat-basiert) war
            die Ende-zu-Ende-Verschlüsselung funktionsschaltergesteuert und besaß einen serverseitigen
            Verschlüsselungspfad, in dem der Betreiber Inhalte technisch entschlüsseln konnte; der anonyme Live-Chat war
            davon praktisch ausgenommen.
            <EvidenceButton evidenceKey="altsystem" /> In der vorliegenden Plattform ist die
            Ende-zu-Ende-Verschlüsselung dauerhaft aktiv, gilt für alle Chat-Formen einschließlich des anonymen
            Live-Chats sowie für Dateien und Sprachnachrichten, und ein serverseitiger Entschlüsselungspfad existiert
            nicht.
        </p>
        <p>
            Die Prüfpflicht dieser DSFA folgt aus <DpiaNorm preset={preset} {...NORMS.dpiaDuty} />.
        </p>
        <h3>5.4 Registrierung, Anonymität und Authentifizierung</h3>
        <p>
            Die Registrierung erfolgt ohne Angabe identifizierender Daten: Ratsuchende erhalten einen systemgenerierten,
            pseudonymen Benutzernamen (frei wählbare Klarnamen sind konstruktionsbedingt ausgeschlossen); Pflichtangabe
            ist die Postleitzahl zur Zuordnung der Beratungsstelle. Eine E-Mail-Adresse ist optional. Die Anmeldung
            erfolgt über ein zentrales Identitätsmanagement (Keycloak, OpenID Connect, signierte Tokens); Passwörter
            werden ausschließlich als gesalzene Hashes gespeichert. Für Ratsuchende steht eine
            Zwei-Faktor-Authentisierung optional zur Verfügung (Authenticator-App oder E-Mail-Einmalcode); für Beratende
            ist die Einrichtung des zweiten Faktors fester Bestandteil des Einladungsprozesses, eine Befreiung ist nur
            administrativ möglich und wird personenbezogen dokumentiert.
            <EvidenceButton evidenceKey="otp" />
        </p>
        {showInternalNotes && (
            <div className={styles.internalNote}>
                <span className={styles.internalTag}>Intern · Härtung</span> Keycloak-Realm:{' '}
                <code>bruteForceProtected=false</code> (kein Lockout, dafür auch keine Login-Failure-/IP-Speicherung)
                und Login-Events landen via <code>jboss-logging</code> mit IP im Server-Log. Beides vor Finalisierung
                entscheiden bzw. härten; keine Rate-Limiting-Behauptung im Trägertext, solange das offen ist.{' '}
            </div>
        )}
        <h3>5.5 Sprachnachrichten</h3>
        <p>
            Die Plattform erlaubt optional das Versenden kurzer Sprachnachrichten (max. 3 Minuten) in allen
            Beratungs-Chat-Formen. Die Funktion ist je Träger und je Chat-Typ (Einzelberatung, anonymer Live-Chat,
            Gruppen, Supervision) im Administrationsbereich abschaltbar; sie ist standardmäßig aktiviert und zusätzlich
            an die Freigabe des Medien-Uploads gekoppelt.
            <EvidenceButton evidenceKey="voiceflags" />
        </p>
        <p>
            <strong>Besonderes Risiko:</strong> Die menschliche Stimme ist ein identifizierendes, biometrienahes
            Merkmal. In einem pseudonymen Beratungssetting schwächt eine Sprachnachricht die Pseudonymität der
            ratsuchenden Person gegenüber der beratenden Person — nicht jedoch gegenüber Plattform- oder Serverbetreiber
            (siehe Schutzmaßnahmen). Ratsuchende geben ihre Stimme freiwillig und aktiv preis (bewusste Aufnahme mit
            Vorschau- und Verwerfen-Möglichkeit); eine heimliche Erhebung findet nicht statt.
        </p>
        <p>
            <strong>Schutzmaßnahmen:</strong> Sprachnachrichten werden ausschließlich Ende-zu-Ende-verschlüsselt
            übertragen: Die Audiodatei wird clientseitig mit einem einmaligen AES-256-Schlüssel verschlüsselt, bevor sie
            das Endgerät verlässt; der Schlüssel wird ausschließlich innerhalb der Megolm-verschlüsselten Chat-Nachricht
            transportiert. Der Server speichert nur nicht entschlüsselbares Chiffrat ohne Dateinamen oder Inhaltstyp;
            auch Aufnahmedauer und -zeitpunkt liegen ausschließlich im verschlüsselten Nachrichteninhalt. Betreiber und
            Plattformanbieter können Sprachnachrichten weder anhören noch inhaltlich auswerten. Systembedingt
            verbleibende Metadaten beim Serverbetreiber sind: Raumzuordnung, pseudonyme Absenderkennung, Zeitstempel und
            Größe des Chiffrats.
        </p>
        <p>
            <strong>Restrisiko / geplante Maßnahmen:</strong> Die Speicherdauer verschlüsselter Mediendateien auf dem
            Server ist derzeit unbegrenzt; eine automatische Löschfrist (Media-Retention) sowie die Umstellung auf
            authentifizierte Medien-Downloads sind als technische Härtungsmaßnahmen vorgesehen.
        </p>
        <h3>5.6 Umgang mit hochgeladenen Mediendateien</h3>
        <p>
            Die Plattform erlaubt Bild-Uploads in Chats (einschließlich anonymer, registrierungsfreier Live-Chats) sowie
            in redaktionellen Rechtstext-Editoren. Für redaktionelle Bilder besteht eine serverseitige Formatvalidierung
            (Magic-Bytes-Whitelist PNG/JPEG/WebP, kein SVG, 2-MB-Limit, authentifizierter Upload).
        </p>
        <p>
            Für Chat-Medien existiert derzeit <strong>kein automatisierter Viren- oder Inhaltsscan</strong>. Als
            risikomindernde Übergangsmaßnahme werden Bilder anonymer Gäste im Live-Chat den Beratenden zunächst nur
            unkenntlich (unscharf) angezeigt und erst nach bewusster Einzelfreigabe durch die beratende Person
            dargestellt; ein Blockieren-Verdikt kann nicht vom Absender manipuliert werden.
            <EvidenceButton evidenceKey="blur" /> Diese Prüfung ist clientseitig durchgesetzt; die Datei selbst bleibt
            serverseitig abrufbar. Außerhalb des anonymen Live-Chats erfolgt keine Vorprüfung der Anzeige.
        </p>
        <p>
            Die Zielarchitektur ist per Architekturentscheidung ADR-019 festgelegt: ein fail-closed Scan-Proxy
            (matrix-content-scanner mit Virenscan und optionaler KI-Bildprüfung), der ungeprüfte oder beanstandete
            Dateien serverseitig unzugänglich hält. Die Implementierung liegt als geprüfter, standardmäßig deaktivierter
            Proof of Concept vor, ist jedoch <strong>nicht produktiv ausgerollt</strong>; die Inbetriebnahme wurde im
            Juli 2026 priorisierungsbedingt zurückgestellt.
            <EvidenceButton evidenceKey="scannerpoc" /> Vor Aktivierung der KI-Bildprüfung ist der Abschluss einer
            Auftragsverarbeitungs-/Sub-Prozessor-Vereinbarung (Zero Retention) mit dem Anbieter erforderlich; der reine
            Virenscan ist davon unabhängig aktivierbar. Restrisiko bis dahin: Schadsoftware- oder rechtswidrige
            Bildinhalte können technisch übertragen und abgerufen werden; die Exposition ist durch die
            Blur-/Freigabemechanik und die Formatvalidierung nur teilweise begrenzt.
        </p>
        <h3>5.7 Kollegiale Fallkoordination (Team-Besprechung) und Fallübergabe (Case Handover)</h3>
        <p>
            <strong>(1) Team-Besprechung.</strong> Zur Koordination einer noch nicht angenommenen Beratungsanfrage steht
            den Berater:innen der zuständigen Beratungsstelle ein separater, technischer Besprechungsraum zur Verfügung
            (ADR-016). Der Raum ist ein eigenständiger Matrix-Raum; die ratsuchende Person ist zu keinem Zeitpunkt
            Mitglied dieses Raums, kann ihn nicht einsehen und nicht auffinden. Die Teilnahmeberechtigung ist
            deckungsgleich mit der Berechtigung, die Anfrage zu sehen: ausschließlich Berater:innen mit aktiver
            Zuordnung zur Beratungsstelle des Falls; ein Zugriff durch andere Beratungsstellen, den Träger oder
            Plattformbetreiber über die Anwendung ist nicht vorgesehen (serverseitige Durchsetzung).
            <EvidenceButton evidenceKey="teamdisc" /> Mit Annahme der Anfrage wird der Besprechungsraum automatisch und
            dauerhaft geschlossen; er bleibt für die Berater:innen der Beratungsstelle ausschließlich lesend erreichbar
            (technisch erzwungen über Matrix-Berechtigungsstufen). Anlage des Raums und Teilnahme der Berater:innen
            werden mit Zeitstempel protokolliert; Nachrichteninhalte werden nicht protokolliert. Ein Zustimmungs- oder
            Widerspruchsrecht der ratsuchenden Person besteht für die Team-Besprechung nicht; die Verarbeitung stützt
            sich insoweit nicht auf eine Einwilligung, sondern ist als interne fachliche Koordination ohne Offenlegung
            der Beratungsinhalte an zusätzliche Empfängerkreise ausgestaltet{' '}
            <span className={styles.muted}>[Rechtsgrundlagen-Einordnung durch den DSB]</span>.
        </p>
        <p>
            <strong>(2) Fallübergabe.</strong> Der Zugriff einer weiteren Beraterin / eines weiteren Beraters auf einen
            bestehenden Beratungsfall (z. B. Vertretung im Krankheitsfall, Urlaubsvertretung, kollegiale Beratung,
            Ausscheiden) erfolgt ausschließlich über ein strukturiertes Übergabeverfahren. Antragsberechtigt sind nur
            Berater:innen derselben Beratungsstelle. Jeder Antrag erfordert die Angabe eines katalogisierten Grundes
            sowie einer Begründung. Je Grund ist festgelegt, ob die vorherige Zustimmung der ratsuchenden Person
            erforderlich ist. Ist die Zustimmung erforderlich, verbleibt der Antrag im Status „ausstehend&quot;; die
            ratsuchende Person entscheidet selbst in der Anwendung über Annahme oder Ablehnung; erst danach wird der
            Zugriff gewährt oder verweigert. Ist keine Zustimmung erforderlich (Standardfall bei Krankheit, Urlaub,
            Notfall, Ausscheiden), wird die ratsuchende Person unmittelbar nach der Übernahme durch eine Systemnachricht
            im Beratungsverlauf über die Übernahme und deren Grund informiert.
        </p>
        <p>
            <strong>(3) Protokollierung.</strong> Jeder Übergabeantrag — einschließlich verweigerter Anträge — wird
            revisionsfähig gespeichert (antragstellende und bisherige Fachkraft, Grund, Ergebnis,
            Zustimmungserfordernis, maßgebliche Richtlinie, Zeitstempel). Beratungsinhalte sind nicht Bestandteil der
            Protokolldaten. Die Einsichtnahme in die Protokolle ist rollenbasiert beschränkt und mandanten- sowie
            beratungsstellen-scharf gefiltert; Administratorkonten ohne Beratungsstellen-Zuordnung erhalten keinen
            Protokollzugriff (Fail-closed-Prinzip).
            <EvidenceButton evidenceKey="handover" />
        </p>
        <p>
            <strong>(4) Technische Vertraulichkeit.</strong> Beide Raumtypen werden serverseitig als private, nicht
            auffindbare Matrix-Räume mit aktivierter Ende-zu-Ende-Verschlüsselung (Megolm) angelegt. Die maßgebliche
            Vertraulichkeitsgrenze gegenüber nicht fallführenden Berater:innen derselben Beratungsstelle ist jedoch
            nicht die Verschlüsselung, sondern die anwendungsseitige Zugriffskontrolle (Sichtbarkeits- und
            Berechtigungssteuerung, beratungsstellen-scharfe Suche) in Verbindung mit dem protokollierten
            Übergabeverfahren; gegenüber Dritten außerhalb der Beratungsstelle besteht zusätzlich eine Trennung auf
            Ebene der Raum-Mitgliedschaft. Der Plattformbetrieb verfügt über administrative Serverfunktionen; ein
            kryptografischer Ausschluss des Betreibers wird nicht zugesichert (siehe Kapitel 10, Betreiberzugriff).
        </p>
        <p>
            <strong>(5) Konfigurierbarkeit.</strong> Die Team-Besprechung ist je Mandant (Träger) durch die
            Plattformadministration aktivierbar bzw. deaktivierbar; zusätzlich besteht ein deployment-weiter Schalter.
            Der Grundkatalog der Fallübergabe einschließlich Zustimmungserfordernis je Grund ist plattformweit
            administrativ konfigurierbar.
        </p>
        {showInternalNotes && (
            <div className={styles.internalNote}>
                <span className={styles.internalTag}>Intern · Gaps G1–G5</span> Nicht behaupten: eine durchgängige
                Delegationskaskade bis auf Beratungsstellen-Ebene existiert für Team-Besprechung/Case-Handover nicht (
                <code>PermissionToggleVisibility</code> deckt beide nicht ab); Admin#655 (Policy-Speichern defekt)
                offen; <code>TENANT_ADMIN</code> kann die globale Policy-Tabelle schreiben
                (SecurityConfig.java:400–403); das Pflicht-Freitextfeld <code>explanation</code> landet im Admin-Log
                (UI-Hinweis oder Maskierung nötig); für die Team-Besprechung werden nur Anlage + Joins protokolliert,
                keine Lese-/Archivzugriffe.{' '}
            </div>
        )}
        <h3>5.8 In-App-Benachrichtigungen (Zeitstrahl)</h3>
        <p>
            Je Benachrichtigungsereignis wird serverseitig ein Datensatz gespeichert (mandantengetrennt):
            Empfänger-Pseudonym, Ereignistyp, Erstell- und Lesezeitpunkt, Session-Referenz, ein anwendungsinterner
            Verweis sowie Anzeigetexte und strukturierte Metadaten.{' '}
            <strong>Inhalte der Beratungskommunikation werden nicht gespeichert:</strong> Nachrichtentexte aus der
            Ende-zu-Ende-verschlüsselten Chat-Kommunikation erreichen die Benachrichtigungspipeline konstruktionsbedingt
            nicht (verschlüsselte Ereignisse tragen keinen Nachrichtenkörper); der konfigurierbare Vorschau-Modus ist
            fest auf „NONE&quot; gesetzt, sodass auch clientseitig übermittelte Vorschautexte verworfen werden.
            <EvidenceButton evidenceKey="notif" /> Gespeichert werden jedoch Kommunikations-<em>Metadaten</em> (wer hat
            wem wann in welcher Session geschrieben, Ereignistyp, Anzeigenamen von Beratenden) sowie bei Fallübergaben
            derzeit auch der von Beratenden verfasste Begründungs-Freitext, der im Einzelfall Rückschlüsse auf
            Beratungsinhalte zulassen kann.
        </p>
        <p>
            Der Zugriff ist auf den jeweiligen Empfänger beschränkt (kein administrativer Lesezugriff über die API);
            Betroffene können ihren Feed selbst vollständig löschen. Eine automatische Aufbewahrungsfrist besteht
            derzeit nicht. <strong>Geplante Abhilfemaßnahmen:</strong> Abschluss der laufenden Migration auf rein
            clientseitig gerenderte Benachrichtigungstexte (wodurch die serverseitigen Klartext-Anzeigetexte
            einschließlich des Fallübergabe-Freitexts entfallen), Einführung einer Regel-Aufbewahrungsfrist mit
            automatischem Löschlauf und Anbindung an den Konto-Löschworkflow sowie Reduktion des Lesezeitstempels auf
            ein Gelesen-Kennzeichen.
        </p>
        <h3>5.9 Cookies, Endgeräte und Websitenutzungsdaten</h3>
        <p>
            Die Plattform verzichtet vollständig auf Tracking, Analysedienste, Werbenetzwerke, externe Schriftarten und
            Drittanbieter-Skripte; sämtliche Assets werden von der Plattform selbst ausgeliefert.
            <EvidenceButton evidenceKey="notracking" /> Zum Einsatz kommen ausschließlich technisch notwendige Cookies;
            ein Einwilligungsbanner ist daher nicht erforderlich (Dokumentation in der Datenschutzerklärung). Auf
            Endgeräten verbleiben Sitzungsdaten und verschlüsseltes Schlüsselmaterial; noch nicht versendete
            Nachrichtenentwürfe werden bis zum Versand lokal auf dem Endgerät gespeichert. Die Absicherung des Endgeräts
            liegt in der Verantwortung der Nutzer:innen; für Beratende gelten die organisatorischen Vorgaben ihres
            Trägers (dienstliche bzw. freigegebene Geräte).
        </p>
        <div className={styles.scrollHint}>Querformat-Tabelle — horizontal scrollbar im eigenen Container </div>
        <DpiaTableScroll label="Kapitel 5: Verfahren und Technik">
            <table className={[styles.dataTable, styles.wideTable].join(' ')}>
                <thead>
                    <tr>
                        <th scope="col">Cookie</th>
                        <th scope="col">Setzer</th>
                        <th scope="col">Zweck</th>
                        <th scope="col">Speicherdauer</th>
                        <th scope="col">Attribute</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <code>keycloak</code>
                        </td>
                        <td>Anwendung</td>
                        <td>API-Authentifizierung (Access-Token)</td>
                        <td>Sitzung</td>
                        <td>SameSite=Strict, Secure</td>
                    </tr>
                    <tr>
                        <td>
                            <code>refreshToken</code>
                        </td>
                        <td>Anwendung</td>
                        <td>Erneuerung der Anmeldesitzung</td>
                        <td>Sitzung</td>
                        <td>SameSite=Strict, Secure</td>
                    </tr>
                    <tr>
                        <td>
                            <code>CSRF-TOKEN</code>
                        </td>
                        <td>Anwendung</td>
                        <td>Schutz vor Cross-Site-Request-Forgery</td>
                        <td>Sitzung</td>
                        <td>SameSite=Strict</td>
                    </tr>
                    <tr>
                        <td>
                            <code>lang</code>
                        </td>
                        <td>Anwendung</td>
                        <td>Sprachwahl</td>
                        <td>Sitzung</td>
                        <td>SameSite=Strict</td>
                    </tr>
                    <tr>
                        <td>
                            <code>useInformal</code>
                        </td>
                        <td>Anwendung</td>
                        <td>Du-/Sie-Präferenz</td>
                        <td>Sitzung</td>
                        <td>SameSite=Strict</td>
                    </tr>
                    <tr>
                        <td>
                            <code>tenantId</code>
                        </td>
                        <td>Anwendung</td>
                        <td>Mandanten-Zuordnung</td>
                        <td>Sitzung</td>
                        <td>SameSite=Strict</td>
                    </tr>
                    <tr>
                        <td>
                            <code>ui-version</code>
                        </td>
                        <td>Anwendung</td>
                        <td>Oberflächen-Versionswahl</td>
                        <td>befristet (Ablaufdatum)</td>
                        <td>SameSite=Lax</td>
                    </tr>
                    <tr>
                        <td>
                            <code>matrix_sso_*</code> (4 Cookies)
                        </td>
                        <td>Anwendung</td>
                        <td>Übergabe der Chat-Sitzung beim Wechsel der Oberflächen-Version</td>
                        <td>Sitzung</td>
                        <td>SameSite=Lax, Secure</td>
                    </tr>
                    <tr>
                        <td>
                            <code>AUTH_SESSION_ID</code>, <code>KEYCLOAK_IDENTITY</code>, <code>KEYCLOAK_SESSION</code>,{' '}
                            <code>KC_RESTART</code>, <code>KEYCLOAK_LOCALE</code>
                        </td>
                        <td>Identitätsmanagement (Keycloak)</td>
                        <td>Single-Sign-on-Sitzung</td>
                        <td>an Sitzungs-Lebensdauer des Realms gebunden</td>
                        <td>HttpOnly, Secure</td>
                    </tr>
                </tbody>
            </table>
        </DpiaTableScroll>
        {showInternalNotes && (
            <div className={styles.internalNote}>
                <span className={styles.internalTag}>Intern · Findings</span>
                <code>keycloak</code>/<code>refreshToken</code> sind nicht HttpOnly und werden zusätzlich in
                localStorage gespiegelt (Finding FE-H01, XSS-Exfiltrationsrisiko); der IndexedDB-Crypto-Store wird beim
                Logout nicht gelöscht (Schlüsselmaterial bleibt auf Shared Devices); Nachrichtenentwürfe liegen
                unverschlüsselt in <code>oriso.chatDrafts.v1</code>. Vor Finalisierung härten oder als Restrisiko
                ausweisen.{' '}
            </div>
        )}
    </section>
);
