/** Verbatim historical evidence from dsfa-page-v2.html. See __fixtures__/README.md. */
export interface DpiaEvidence {
    title: string;
    who: string;
    when: string;
    what: string;
    src: string;
    links: ReadonlyArray<{ label: string; href: string }>;
}

export const DPIA_EVIDENCE = {
    vodozemac: {
        title: 'vodozemac ist extern auditiert',
        who: 'Least Authority (unabhängiges Security-Audit), beauftragt von der Matrix.org Foundation',
        when: 'Mai 2022; Nachaudit der Bezugsimplementierung libolm 2024 im gematik-Umfeld',
        what: 'Öffentliches, unabhängiges Audit der Rust-Referenzimplementierung der Matrix-Ende-zu-Ende-Verschlüsselung (vodozemac: Olm/Megolm). Ergänzend existiert eine formale Analyse des Matrix-Kryptoprotokolls („The Matrix Reloaded“).',
        src: '',
        links: [
            {
                label: 'Matrix.org: Independent public audit of vodozemac (2022)',
                href: 'https://matrix.org/blog/2022/05/16/independent-public-audit-of-vodozemac-a-native-rust-reference-implementation-of-matrix-end-to-end-encryption/',
            },
            {
                label: 'Formale Analyse: The Matrix Reloaded (arXiv 2408.12743)',
                href: 'https://arxiv.org/pdf/2408.12743',
            },
        ],
    },
    megolm: {
        title: 'Olm/Megolm sind offen spezifiziert',
        who: 'Matrix.org Foundation (Spezifikationspflege)',
        when: 'laufend versionierte Spezifikation',
        what: 'Die eingesetzten Verschlüsselungsverfahren (m.megolm.v1.aes-sha2, Olm/Double-Ratchet-Familie) sind Teil der öffentlichen Matrix-Spezifikation — kein proprietäres Verfahren.',
        src: '',
        links: [
            {
                label: 'Matrix-Spezifikation (spec.matrix.org)',
                href: 'https://spec.matrix.org/latest/',
            },
            {
                label: 'E2EE-Konzeptdokumentation (matrix.org)',
                href: 'https://matrix.org/docs/matrix-concepts/end-to-end-encryption/',
            },
        ],
    },
    'e2ee-enforced': {
        title: 'E2EE wird serverseitig erzwungen',
        who: 'ORISO-UserService + ORISO-Helm (Deployment-Wahrheit)',
        when: 'Ist-Zustand, verifiziert 14.08.2026',
        what: 'Jeder Beratungsraum wird mit m.room.encryption (m.megolm.v1.aes-sha2, preset private_chat) angelegt; das steuernde Flag steht im Deployment fest auf true. Client initialisiert Rust-Crypto unconditional.',
        src: 'MatrixRoomClient.java:53–67, 100–111 · MatrixSynapseService.java:864–869 · ORISO-Helm values.yaml.default:258 (matrixEncryptionEnabled: "true") · matrixClientService.ts:154',
        links: [
            {
                label: 'Code-Graph: ORISO-UserService',
                href: 'https://understand.oriso.org/#ORISO-UserService',
            },
            {
                label: 'Code-Graph: ORISO-Helm',
                href: 'https://understand.oriso.org/#ORISO-Helm',
            },
            {
                label: 'Repository ORISO-UserService (GitHub)',
                href: 'https://github.com/OpenResilienceInitiative/ORISO-UserService',
            },
        ],
    },
    attachment: {
        title: 'Dateien: clientseitige AES-256-Verschlüsselung',
        who: 'ORISO-Frontend',
        when: 'Ist-Zustand, verifiziert 14.08.2026',
        what: 'Jeder Datei-Send läuft unkonditional durch encryptMatrixAttachment (AES-256-CTR, frischer Zufallsschlüssel + IV pro Datei, SHA-256-Hash, Matrix-EncryptedFile v2); Upload als application/octet-stream mit includeFilename:false — der Server erhält weder Dateinamen noch MIME-Typ. Ein unverschlüsselter Uploadpfad existiert nicht.',
        src: 'src/utils/matrixEncryptedAttachment.ts · matrixClientService.ts:727–764 · buildMatrixFileMessageContent:48–64',
        links: [
            {
                label: 'Code-Graph: ORISO-Frontend',
                href: 'https://understand.oriso.org/#ORISO-Frontend',
            },
            {
                label: 'Repository ORISO-Frontend (GitHub)',
                href: 'https://github.com/OpenResilienceInitiative/ORISO-Frontend',
            },
        ],
    },
    federation: {
        title: 'Matrix-Föderation ist deaktiviert',
        who: 'Architekturentscheidung ADR-005 (ORISO Docs) + Helm-Konfiguration',
        when: 'Accepted; Ist-Zustand 14.08.2026',
        what: 'Der Homeserver föderiert nicht mit fremden Matrix-Servern; es bestehen keine Föderations-Datenflüsse. Konten entstehen ausschließlich über das Identitätsmanagement der Plattform.',
        src: 'ADR-005 (0 - Docs) · ORISO-Helm templates/matrix/matrix-configmaps.yaml',
        links: [
            {
                label: 'Code-Graph: ORISO-Helm (Matrix-Konfiguration)',
                href: 'https://understand.oriso.org/#ORISO-Helm',
            },
        ],
    },
    altsystem: {
        title: 'Vorgängersystem: serverseitiger Verschlüsselungspfad',
        who: 'Code-Analyse der öffentlichen Repositories der Vorgängerplattform (GitHub-Org Onlineberatung)',
        when: 'Analyse-Stand 13.08.2026 (main-Branches)',
        what: 'Im Vorgängersystem wählte der Nachrichtentyp zwischen echtem E2EE (Rocket.Chat-Schema, flag-gesteuert) und serverseitiger AES-Verschlüsselung (MessageService, AES/ECB, Schlüsselfragmente auf dem Server) — im Standard-/Fallback-Pfad konnte der Betreiber technisch mitlesen; der anonyme Live-Chat fiel mangels Login-Passworts praktisch aus dem E2EE heraus.',
        src: 'onlineBeratung-messageService EncryptionService.java (AES/ECB/PKCS5, masterKey) · RocketChatService.extractMessageText · frontend encryptionHelpers.ts (getTmpMasterKey = SHA-256(rcUserId))',
        links: [
            {
                label: 'GitHub-Organisation Onlineberatung (Vorgängersystem)',
                href: 'https://github.com/Onlineberatung',
            },
        ],
    },
    otp: {
        title: '2FA: vendored OTP-SPI + Einladungsprozess',
        who: 'Architekturentscheidung ADR-013; ORISO-Keycloak (otp-config SPI); ORISO-UserService (Einladungsflow)',
        when: 'Accepted / live; Ist-Zustand 14.08.2026',
        what: 'TOTP (Authenticator-App) und E-Mail-Einmalcode über ein selbst gepflegtes Keycloak-SPI. Der Einladungsdatensatz für Beratende führt TOTP-Einrichtung und 2FA-Status; eine Befreiung wird personenbezogen als two_factor_waived_by dokumentiert.',
        src: 'ADR-013 (0 - Docs) · AccountInvite.java (totp_pending_secret, two_factor_waived_by) · otp-config-spi (MailOtpCredentialModel)',
        links: [
            {
                label: 'Code-Graph: ORISO-UserService',
                href: 'https://understand.oriso.org/#ORISO-UserService',
            },
            {
                label: 'Code-Graph: ORISO-Keycloak',
                href: 'https://understand.oriso.org/#ORISO-Keycloak',
            },
        ],
    },
    voiceflags: {
        title: 'Sprachnachrichten: Flag-Familie + Kopplung an Medien-Upload',
        who: 'ORISO-Frontend / ORISO-Admin (Flag-Familie nach ADR-015-Muster)',
        when: 'Ist-Zustand, verifiziert 14.08.2026',
        what: 'Eigene Flag-Familie featureVoiceMessages* (Master + 4 Chat-Typ-Varianten), im Admin-Panel je Träger schaltbar und über allowedPermissionToggles plattformseitig steuerbar; das Frontend-Gate prüft Master-Flag, Chat-Typ-Variante und die Medien-Upload-Freigabe. Aufnahme begrenzt auf 180 s.',
        src: 'TenantDataInterface.ts:76–80 · messageSubmitInterfaceComponent.tsx:1990–2006, 2880 ff. · chatTypeCards.ts · permissionsSettingsUtils.ts:110–120',
        links: [
            {
                label: 'Code-Graph: ORISO-Frontend',
                href: 'https://understand.oriso.org/#ORISO-Frontend',
            },
            {
                label: 'Code-Graph: ORISO-Admin',
                href: 'https://understand.oriso.org/#ORISO-Admin',
            },
        ],
    },
    blur: {
        title: 'Blur + Click-to-Reveal ist fail-closed',
        who: 'ORISO-Frontend (Phase 1 des Media-Security-Epics, gemergt)',
        when: 'Live seit Juli 2026; verifiziert 14.08.2026',
        what: 'Bilder anonymer Gäste im Live-Chat durchlaufen das Zustandsmodell uploading → unchecked(blur) → safe/blocked/error; ein blocked-Verdikt wird ausschließlich fail-closed aus Event-Metadaten akzeptiert — Absender können sich nicht selbst als „sicher“ markieren.',
        src: 'MessageAttachment.tsx:176 ff. · matrixTimelineEventFormatter · Frontend PR #547/#549',
        links: [
            {
                label: 'Code-Graph: ORISO-Frontend',
                href: 'https://understand.oriso.org/#ORISO-Frontend',
            },
            {
                label: 'EPIC Admin#366 (Phasenstatus)',
                href: 'https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/366',
            },
        ],
    },
    scannerpoc: {
        title: 'Scan-Proxy: beschlossen, gebaut, nicht deployed',
        who: 'ADR-019 (fail-closed matrix-content-scanner); PoC-Chart auf Feature-Branch (ORISO-Helm)',
        when: 'PoC Juli 2026; Infra-PRs #111/#112 am 29.07.2026 unmerged geschlossen; Status „On hold“',
        what: 'Der fail-closed Scan-Proxy (ClamAV + optionale KI-Bildprüfung) existiert als standardmäßig deaktivierter Proof of Concept auf dem Branch feat/media-scanner-poc; origin/main enthält kein Scanner-Template. In keinem Environment produktiv.',
        src: 'ORISO-Helm Branch feat/media-scanner-poc: templates/media-scanner/ · Issues Helm#98/#99 (On hold)',
        links: [
            {
                label: 'Issue ORISO-Helm#98 (Scanner-PoC)',
                href: 'https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/98',
            },
            {
                label: 'Code-Graph: ORISO-Helm',
                href: 'https://understand.oriso.org/#ORISO-Helm',
            },
        ],
    },
    teamdisc: {
        title: 'Team-Besprechung: Zugriff serverseitig erzwungen',
        who: 'ORISO-UserService (TeamDiscussionFacade) + ADR-016',
        when: 'Ist-Zustand, verifiziert 14.08.2026 (pre-dev HEAD 7471b852)',
        what: 'requireEligibleConsultant lässt nur Berater:innen mit aktiver consultant_agency-Zuordnung der Fall-Beratungsstelle zu (sonst HTTP 403); die ratsuchende Person wird nie Raum-Mitglied. Bei Annahme der Anfrage: Status ARCHIVED + Matrix-PowerLevel events_default 50 → dauerhaft nur noch lesend.',
        src: 'TeamDiscussionFacade.java:163–176 (Scoping), 30–37 (Designregel), 44, 273–302 (hard close) · SecurityConfig.java:299–301 · ADR-016',
        links: [
            {
                label: 'Code-Graph: ORISO-UserService',
                href: 'https://understand.oriso.org/#ORISO-UserService',
            },
        ],
    },
    handover: {
        title: 'Fallübergabe: lückenlose, inhaltsfreie Audit-Zeile',
        who: 'ORISO-UserService (CaseHandoverService, CaseHandoverLogsService)',
        when: 'Ist-Zustand, verifiziert 14.08.2026',
        what: 'Jeder Antrag — auch abgelehnte — erzeugt eine Audit-Zeile (reason_code, status, audit_outcome, policy_authority, client_consent_required, Zeitstempel); Nachrichteninhalte werden nirgends geloggt. Admin-Einsicht ist mandanten- und beratungsstellen-scoped; Admins ohne Agency-Zuordnung sehen nichts (fail-closed).',
        src: 'case_handover_request (Changeset 0057) · CaseHandoverService.java:55–61, 671–696 · CaseHandoverLogsService.java:33–109 (fail-closed 40–49)',
        links: [
            {
                label: 'Code-Graph: ORISO-UserService',
                href: 'https://understand.oriso.org/#ORISO-UserService',
            },
        ],
    },
    notif: {
        title: 'Benachrichtigungen: E2EE-Inhalte erreichen die Pipeline nicht',
        who: 'ORISO-UserService (MatrixEventListenerService, EventNotificationService)',
        when: 'Ist-Zustand, verifiziert 14.08.2026',
        what: 'Der Matrix-Listener verarbeitet in verschlüsselten Räumen nur Metadaten (verschlüsselte Events tragen keinen Nachrichtenkörper). Der Vorschau-Modus privacy.notificationPreviewMode steht auf NONE; clientseitig übermittelte Vorschautexte werden verworfen.',
        src: 'MatrixEventListenerService.java:430–437, 518–543 · EventNotificationService.java:784–829 · application.properties:358–359 (Default NONE)',
        links: [
            {
                label: 'Code-Graph: ORISO-UserService',
                href: 'https://understand.oriso.org/#ORISO-UserService',
            },
        ],
    },
    notracking: {
        title: 'Keine Browser-Telemetrie, keine Dritt-Ressourcen',
        who: 'Code-Inventar Frontend/Admin (Volltext-Scan beider src/-Bäume + package.json)',
        when: 'Scan-Stand 14.08.2026',
        what: 'Kein Sentry-, PostHog-, Matomo-, Google-Analytics- oder vergleichbares SDK im Auslieferungscode; keine externen Font-/CDN-Loads — Assets werden self-hosted ausgeliefert; keine Laufzeit-Übersetzungsdienste im Browser.',
        src: 'grep sentry|posthog|matomo|gtag|plausible über ORISO-Frontend + ORISO-Admin: 0 Treffer · public/static (self-hosted Assets)',
        links: [
            {
                label: 'Code-Graph: ORISO-Frontend',
                href: 'https://understand.oriso.org/#ORISO-Frontend',
            },
            {
                label: 'Code-Graph: ORISO-Admin',
                href: 'https://understand.oriso.org/#ORISO-Admin',
            },
        ],
    },
    suppression: {
        title: 'Kleinstzellen-Unterdrückung (min. 5, fail-closed)',
        who: 'ORISO-UserService (AdminDashboardStatisticsService)',
        when: 'Ist-Zustand; in der Produktivkonfiguration erzwungen',
        what: 'Das Admin-Statistik-Dashboard liefert ausschließlich Aggregatzählungen; Aggregate mit weniger als fünf beitragenden Beratenden werden unterdrückt (fail-closed). Agency-Admins sehen nur die eigenen Beratungsstellen.',
        src: 'application.properties:241–244 · application-prod.properties:92 (erzwungen) · AdminDashboardStatisticsService.java:240–244, 495–509',
        links: [
            {
                label: 'Code-Graph: ORISO-UserService',
                href: 'https://understand.oriso.org/#ORISO-UserService',
            },
        ],
    },
    hmac: {
        title: 'Beraterstatistik: HMAC-SHA256-Pseudonymisierung',
        who: 'ORISO-UserService (ConsultantIdentityHasher)',
        when: 'Ist-Zustand; Privacy-Härtung ausgeliefert',
        what: 'Die Nachrichtenzählung speichert statt der Beraterkennung ein HMAC-SHA256-Pseudonym (Geheimnis als Deployment-Secret). Beratende sehen über den Selbststatistik-Endpunkt nur eigene Zahlen (own-data-only).',
        src: 'ConsultantIdentityHasher.java:23–46 · ConsultantMessageStat.java:30–54 · ConsultantStatisticsController.java:26',
        links: [
            {
                label: 'Code-Graph: ORISO-UserService',
                href: 'https://understand.oriso.org/#ORISO-UserService',
            },
        ],
    },
    delete: {
        title: 'Konto-Löschworkflow mit Matrix-erase',
        who: 'ORISO-UserService (workflow/delete)',
        when: 'Ist-Zustand, verifiziert 14.08.2026; täglicher Lauf',
        what: 'Kettenlöschung Keycloak → Matrix (Deaktivierung mit erase:true + Raum-Purge purge:true) → Sessions samt Zusatzdaten → Zuordnungen → Konto-Zeile. Read-Only-Schutzfenster 48 h; anonyme Live-Chat-Konten werden nach ~47 h automatisiert gelöscht.',
        src: 'DeleteUserAccountService.java:47–106 · MatrixSynapseService.java:636–705 (erase/purge) · application.properties:79–86',
        links: [
            {
                label: 'Code-Graph: ORISO-UserService',
                href: 'https://understand.oriso.org/#ORISO-UserService',
            },
        ],
    },
    tenantsettings: {
        title: 'Träger-Einstellungen: Klartext-Spalte, zugriffsgeprüft',
        who: 'ORISO-TenantService (TenantEntity, TenantFacadeAuthorisationService)',
        when: 'Ist-Zustand, verifiziert 16.08.2026 gegen den Code-Graph',
        what: 'Die Träger-Einstellungen — darunter die SMTP-Zugangsdaten — liegen als ein einziges JSON-Feld settings in einer unverschlüsselten Datenbankspalte. Vertraulich bleiben sie allein durch die Zugriffsprüfung: assertUserIsAuthorizedToAccessTenant lässt einen Single-Tenant-Admin nur an die eigene Träger-ID; jede andere ID endet in AccessDenied. Eine Verschlüsselung auf Feldebene besteht nicht — deshalb steht der Punkt als offener Kandidat in der Risiko-Vollmatrix.',
        src: 'TenantEntity.java:102–103 (@Column settings, kein Krypto) · TenantFacadeAuthorisationService.java:48 ff. (assertUserIsAuthorizedToAccessTenant)',
        links: [
            {
                label: 'Code-Graph: ORISO-TenantService',
                href: 'https://understand.oriso.org/#ORISO-TenantService',
            },
        ],
    },
    livekit: {
        title: 'Video: Media-E2EE, keine Aufzeichnung konfiguriert',
        who: 'ORISO-Livekit / ORISO-ElementCall (Deployment-Konfiguration)',
        when: 'Ist-Zustand, verifiziert 14.08.2026',
        what: 'Element Call läuft gegen die eigene LiveKit-SFU der Plattform; in der LiveKit-Konfiguration ist kein Egress-/Recording-Block vorhanden — es existiert kein Aufzeichnungspfad. Raum-/Teilnehmer-Metadaten werden nur flüchtig (in-memory) gehalten. Die Element-Call-Auslieferung enthält keine Telemetrie (kein PostHog/Rageshake/Sentry in der deployten Config).',
        src: 'ORISO-Livekit/livekit.yaml (kein egress-Block; empty_timeout 300 s) · ORISO-Helm templates/element-call/element-call-configmap.yaml',
        links: [
            {
                label: 'Code-Graph: ORISO-Livekit',
                href: 'https://understand.oriso.org/#ORISO-Livekit',
            },
            {
                label: 'Code-Graph: ORISO-ElementCall',
                href: 'https://understand.oriso.org/#ORISO-ElementCall',
            },
        ],
    },
} satisfies Record<string, DpiaEvidence>;
export type DpiaEvidenceKey = keyof typeof DPIA_EVIDENCE;

export interface DpiaCodeLocation {
    slug: string;
    path: string;
    from: number;
    to: number;
    label: string;
}
/** Source CODE map, verified in the artifact on 16.08.2026; no live verification implied. */
export const DPIA_CODE_LOCATIONS: Partial<Record<DpiaEvidenceKey, readonly DpiaCodeLocation[]>> = {
    'e2ee-enforced': [
        {
            slug: 'user-service',
            path: 'src/main/java/de/caritas/cob/userservice/api/adapters/matrix/MatrixRoomClient.java',
            from: 112,
            to: 123,
            label: 'Raumanlage: m.room.encryption',
        },
        {
            slug: 'user-service',
            path: 'src/main/java/de/caritas/cob/userservice/api/adapters/matrix/MatrixRoomClient.java',
            from: 33,
            to: 34,
            label: 'Megolm-Algorithmus',
        },
        {
            slug: 'helm',
            path: 'templates/userservice/userservice-configmap-env.yaml',
            from: 142,
            to: 142,
            label: 'Deployment-Flag',
        },
    ],
    attachment: [
        {
            slug: 'frontend',
            path: 'src/utils/matrixEncryptedAttachment.ts',
            from: 73,
            to: 100,
            label: 'AES-256-CTR je Datei',
        },
        {
            slug: 'frontend',
            path: 'src/services/matrixClientService.ts',
            from: 884,
            to: 900,
            label: 'Upload ohne Name/MIME',
        },
    ],
    federation: [
        {
            slug: 'helm',
            path: 'templates/matrix/matrix-configmaps.yaml',
            from: 112,
            to: 117,
            label: 'Synapse: keine Föderation',
        },
    ],
    otp: [
        {
            slug: 'user-service',
            path: 'src/main/java/de/caritas/cob/userservice/api/model/AccountInvite.java',
            from: 130,
            to: 143,
            label: 'TOTP + Befreiungsnachweis',
        },
    ],
    voiceflags: [
        {
            slug: 'frontend',
            path: 'src/globalState/interfaces/TenantDataInterface.ts',
            from: 90,
            to: 94,
            label: 'Flag-Familie',
        },
    ],
    blur: [
        {
            slug: 'frontend',
            path: 'src/components/message/MessageAttachment.tsx',
            from: 22,
            to: 30,
            label: 'Zustandsmodell',
        },
        {
            slug: 'frontend',
            path: 'src/components/message/MessageAttachment.tsx',
            from: 258,
            to: 295,
            label: 'Fail-closed + Blur',
        },
    ],
    teamdisc: [
        {
            slug: 'user-service',
            path: 'src/main/java/de/caritas/cob/userservice/api/facade/TeamDiscussionFacade.java',
            from: 163,
            to: 177,
            label: 'Zugriffsprüfung (403)',
        },
    ],
    handover: [
        {
            slug: 'user-service',
            path: 'src/main/java/de/caritas/cob/userservice/api/service/CaseHandoverService.java',
            from: 683,
            to: 707,
            label: 'Audit-Zeile auch bei Ablehnung',
        },
        {
            slug: 'user-service',
            path: 'src/main/java/de/caritas/cob/userservice/api/service/CaseHandoverLogsService.java',
            from: 38,
            to: 49,
            label: 'Fail-closed Admin-Einsicht',
        },
    ],
    notif: [
        {
            slug: 'user-service',
            path: 'src/main/java/de/caritas/cob/userservice/api/service/matrix/MatrixEventListenerService.java',
            from: 441,
            to: 450,
            label: 'Nur Metadaten bei m.room.encrypted',
        },
    ],
    suppression: [
        {
            slug: 'user-service',
            path: 'src/main/java/de/caritas/cob/userservice/api/service/statistics/AdminDashboardStatisticsService.java',
            from: 38,
            to: 48,
            label: 'Kleinstzellen-Schwelle 5',
        },
        {
            slug: 'user-service',
            path: 'src/main/java/de/caritas/cob/userservice/api/service/statistics/AdminDashboardStatisticsService.java',
            from: 60,
            to: 65,
            label: 'in prod erzwungen',
        },
    ],
    hmac: [
        {
            slug: 'user-service',
            path: 'src/main/java/de/caritas/cob/userservice/api/service/statistics/ConsultantIdentityHasher.java',
            from: 21,
            to: 46,
            label: 'HMAC-SHA256-Pseudonym',
        },
    ],
    delete: [
        {
            slug: 'user-service',
            path: 'src/main/java/de/caritas/cob/userservice/api/workflow/delete/service/DeleteUserAccountService.java',
            from: 66,
            to: 82,
            label: 'Löschkette',
        },
    ],
    tenantsettings: [
        {
            slug: 'tenant-service',
            path: 'src/main/java/com/vi/tenantservice/api/model/TenantEntity.java',
            from: 100,
            to: 104,
            label: 'settings als Klartext-Spalte',
        },
        {
            slug: 'tenant-service',
            path: 'src/main/java/com/vi/tenantservice/api/facade/TenantFacadeAuthorisationService.java',
            from: 48,
            to: 70,
            label: 'Zugriffsprüfung je Träger',
        },
    ],
};
