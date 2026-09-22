package de.caritas.cob.userservice.api.service.accountinvite.mail;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import de.caritas.cob.userservice.api.admin.service.tenant.TenantService;
import de.caritas.cob.userservice.api.model.InviteEmailTemplate;
import de.caritas.cob.userservice.api.port.out.InviteEmailTemplateRepository;
import de.caritas.cob.userservice.api.service.accountinvite.InviteAcceptUrlBuilder;
import de.caritas.cob.userservice.api.service.accountinvite.InviteEmailPreviewService;
import de.caritas.cob.userservice.api.service.accountinvite.InviteEmailPreviewService.InviteEmailPreview;
import de.caritas.cob.userservice.api.service.accountinvite.InviteEmailPreviewService.PreviewCommand;
import de.caritas.cob.userservice.api.service.accountinvite.InviteEmailTemplateKind;
import de.caritas.cob.userservice.api.service.consultingtype.ApplicationSettingsService;
import de.caritas.cob.userservice.api.service.email.layout.BrandedEmail;
import de.caritas.cob.userservice.api.service.email.layout.EmailBrandingResolver;
import de.caritas.cob.userservice.api.service.emailsupplier.TenantTemplateSupplier;
import de.caritas.cob.userservice.api.service.notification.AdminPanelUrl;
import de.caritas.cob.userservice.tenantservice.generated.web.model.RestrictedTenantDTO;
import de.caritas.cob.userservice.tenantservice.generated.web.model.Theming;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

/**
 * Writes the Storybook fixtures consumed by ORISO-Admin, rendered through the ORISO e-mail frame
 * ({@link InviteFrameMailRenderer}, template {@code einladung-freitext}).
 *
 * <p>This is a generator, not an assertion: it drives the <em>real</em> {@link
 * InviteEmailPreviewService} — the same object the {@code GET/POST
 * /useradmin/invite-email-templates/preview} controller calls — so the checked-in fixtures are
 * byte-identical to the endpoint's {@code html}/{@code plainText}. Only the outer boundaries are
 * stubbed: the template repository, the TenantService branding lookup and the SMTP settings the
 * dispatcher reads. Nothing here re-implements or post-processes the markup.
 *
 * <p>It is disabled by default so it never runs in CI. Run it explicitly:
 *
 * <pre>
 *   ./mvnw -o test -Dtest=InviteFrameFixtureGenerator \
 *          -Doriso.email.fixtures.out=/path/to/ORISO-Admin/src/.../fixtures
 * </pre>
 *
 * <p>The canonical refresh path once the backend is deployed is the curl recipe in the Admin repo's
 * {@code scripts/email-fixtures/README.md}; this generator exists because the endpoint is not
 * deployed anywhere yet.
 */
class InviteFrameFixtureGenerator {

  private static final String OUT_DIR_PROPERTY = "oriso.email.fixtures.out";
  private static final long BRANDED_TENANT_ID = 7L;
  private static final long LONG_TEMPLATE_ID = 5L;
  private static final long SHORT_TEMPLATE_ID = 6L;

  private final InviteEmailTemplateRepository templateRepository =
      mock(InviteEmailTemplateRepository.class);
  private final TenantService tenantService = mock(TenantService.class);
  private final TenantTemplateSupplier tenantTemplateSupplier = mock(TenantTemplateSupplier.class);
  private final RestTemplate restTemplate = mock(RestTemplate.class);
  private final ApplicationSettingsService applicationSettingsService =
      mock(ApplicationSettingsService.class);
  private final InviteMailTransport inviteMailTransport = mock(InviteMailTransport.class);

  @Test
  void writeFixtures() throws IOException {
    String outDir = System.getProperty(OUT_DIR_PROPERTY);
    org.junit.jupiter.api.Assumptions.assumeTrue(
        outDir != null && !outDir.isBlank(),
        "Set -D" + OUT_DIR_PROPERTY + "=<dir> to generate the Storybook fixtures");

    Path target = Path.of(outDir);
    Files.createDirectories(target);

    stubBackends();
    InviteMailDispatchService dispatchService = dispatchService();
    InviteEmailPreviewService previewService =
        new InviteEmailPreviewService(
            templateRepository,
            new InviteAcceptUrlBuilder(
                "https://app.oriso.org", "https://admin.oriso.org", "https://app.oriso.org"),
            dispatchService,
            new AdminPanelUrl("https://admin.oriso.org"));

    List<String> written = new ArrayList<>();

    written.add(
        writePreview(
            target,
            "invite-platform-de",
            previewService.preview(
                new PreviewCommand(
                    null, InviteEmailTemplateKind.TENANT_INVITE, null, null, null, "de"))));

    written.add(
        writePreview(
            target,
            "invite-platform-en",
            previewService.preview(
                new PreviewCommand(
                    null, InviteEmailTemplateKind.TENANT_INVITE, null, null, null, "en"))));

    written.add(
        writePreview(
            target,
            "invite-tenant-logo-de",
            previewService.preview(
                new PreviewCommand(
                    null,
                    InviteEmailTemplateKind.TENANT_INVITE,
                    null,
                    null,
                    BRANDED_TENANT_ID,
                    "de"))));

    written.add(
        writePreview(
            target,
            "invite-long-content-de",
            previewService.preview(
                new PreviewCommand(LONG_TEMPLATE_ID, null, null, null, null, null))));

    written.add(
        writePreview(
            target,
            "invite-short-content-de",
            previewService.preview(
                new PreviewCommand(SHORT_TEMPLATE_ID, null, null, null, null, null))));

    // No call-to-action: the dispatcher's no-action overload (InviteMailDispatchService#send with
    // a null primaryActionUrl) renders the same layout without the button block. The preview
    // endpoint always carries an invite link, so this state cannot be curl'ed today — see the
    // note in BrandedEmailLayout.stories.tsx.
    written.add(
        writeBranded(
            target,
            "notification-no-cta-de",
            dispatchService.renderBrandedMail(
                "Ihr Konto wurde aktiviert",
                """
                Hallo Erika Musterfrau,

                Ihr Konto auf der ORISO-Plattform ist ab sofort aktiv. Sie können sich wie
                gewohnt anmelden.

                Diese Nachricht dient nur zu Ihrer Information und enthält keine Aktion.""",
                null,
                null,
                "de")));

    Files.writeString(
        target.resolve("MANIFEST.txt"),
        String.join(
            "\n",
            "Generated by ORISO-UserService InviteFrameFixtureGenerator (InviteFrameMailRenderer, "
                + sourceRevision()
                + ", "
                + LocalDate.now()
                + ").",
            "Do not edit by hand — see scripts/email-fixtures/README.md to refresh.",
            "",
            String.join("\n", written),
            ""),
        StandardCharsets.UTF_8);

    System.out.println("Branded e-mail fixtures written to " + target.toAbsolutePath());
  }

  /**
   * The UserService checkout the fixtures were rendered from, read at run time so the manifest can
   * never describe an older revision than the one that produced the files.
   */
  private static String sourceRevision() {
    try {
      String commit = git("log", "-1", "--format=%h (%cs)");
      if (commit.isEmpty()) {
        return "unknown revision";
      }
      boolean dirty = !git("status", "--porcelain", "--untracked-files=no").isEmpty();
      return "UserService @ " + commit + (dirty ? " + uncommitted changes" : "");
    } catch (IOException e) {
      return "unknown revision";
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return "unknown revision";
    }
  }

  private static String git(String... args) throws IOException, InterruptedException {
    List<String> command = new ArrayList<>(List.of("git"));
    command.addAll(List.of(args));
    Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
    String out = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
    return process.waitFor() == 0 ? out : "";
  }

  private String writePreview(Path target, String name, InviteEmailPreview preview)
      throws IOException {
    Files.writeString(target.resolve(name + ".html"), preview.html(), StandardCharsets.UTF_8);
    Files.writeString(target.resolve(name + ".txt"), preview.plainText(), StandardCharsets.UTF_8);
    return name + " — subject: " + preview.subject() + " | acceptUrl: " + preview.sampleAcceptUrl();
  }

  private String writeBranded(Path target, String name, BrandedEmail mail) throws IOException {
    Files.writeString(target.resolve(name + ".html"), mail.html(), StandardCharsets.UTF_8);
    Files.writeString(target.resolve(name + ".txt"), mail.plainText(), StandardCharsets.UTF_8);
    return name + " — subject: " + mail.subject() + " | no call-to-action";
  }

  private InviteMailDispatchService dispatchService() {
    return new InviteMailDispatchService(
        restTemplate,
        applicationSettingsService,
        inviteMailTransport,
        InviteFrameMailRendererFixture.inviteFrameMailRenderer(
            new EmailBrandingResolver(
                tenantService, tenantTemplateSupplier, "ORISO", "", "https://app.oriso.org")),
        "http://consultingtypeservice:8080/service",
        "smtp-user",
        "smtp-pass");
  }

  private void stubBackends() {
    // No `globalSmtpEmailThemeColor`: since the colour fix on ORISO-UserService#914 the mail
    // palette
    // comes from `theming.primaryColor` -> EmailColors.PLATFORM_ACCENT_DARK only, and the SMTP
    // transport setting is deliberately not read. Stubbing it here would suggest otherwise.
    when(restTemplate.getForObject(anyString(), any()))
        .thenReturn(
            Map.of(
                "globalFeatureSystemNotificationEmailsEnabled", Map.of("value", true),
                "globalSmtpEnabled", Map.of("value", true),
                "globalSmtpHost", Map.of("value", "smtp.example.org"),
                "globalSmtpPort", Map.of("value", "587"),
                "globalSmtpSecure", Map.of("value", false),
                "globalSmtpFrom", Map.of("value", "noreply@example.org")));
    when(inviteMailTransport.send(any(), any(), any(), any(), any()))
        .thenReturn(new InviteMailSendReceipt("to@example.org", Instant.now()));
    when(tenantTemplateSupplier.getTemplateAttributes()).thenReturn(List.of());

    Theming theming = new Theming();
    theming.setLogo("https://cdn.example.org/nord-logo.png");
    theming.setPrimaryColor("#f8e71c");
    RestrictedTenantDTO tenant = new RestrictedTenantDTO();
    tenant.setId(BRANDED_TENANT_ID);
    tenant.setName("Beratungsstelle Nord");
    tenant.setTheming(theming);
    when(tenantService.getRestrictedTenantData(BRANDED_TENANT_ID)).thenReturn(tenant);

    when(templateRepository.findById(LONG_TEMPLATE_ID))
        .thenReturn(
            Optional.of(
                InviteEmailTemplate.builder()
                    .id(LONG_TEMPLATE_ID)
                    .kind(InviteEmailTemplateKind.COUNSELLOR_INVITE)
                    .name("Berater-Onboarding (ausführlich)")
                    .language("de")
                    .subject("Willkommen im Beratungsteam, {{firstName}}")
                    .body(
                        """
                        <h2>Herzlich willkommen, {{firstName}} {{lastName}}</h2>
                        <p>Sie wurden als Beraterin oder Berater für die ORISO-Plattform
                        freigeschaltet. Damit Sie gut starten können, haben wir die wichtigsten
                        Schritte zusammengefasst.</p>
                        <h3>Was Sie zuerst tun sollten</h3>
                        <ol>
                        <li>Konto über die Einladung unten einrichten und ein Passwort
                        vergeben.</li>
                        <li>Zwei-Faktor-Authentisierung aktivieren — sie ist für alle beratenden
                        Rollen verpflichtend.</li>
                        <li>Profilangaben und Beratungsthemen prüfen und ergänzen.</li>
                        <li>Die Hinweise zur Schweigepflicht und zum Datenschutz lesen.</li>
                        </ol>
                        <h3>Ihre Ansprechpersonen</h3>
                        <p>Fachliche Fragen beantwortet Ihre Teamleitung. Technische Fragen richten
                        Sie bitte an den Support Ihrer Einrichtung. Eine Übersicht finden Sie im
                        Handbuch unter https://handbuch.example.org/beratung/erste-schritte</p>
                        <h3>Gut zu wissen</h3>
                        <ul>
                        <li>Ratsuchende sehen nur Ihren Vornamen und Ihr Beratungsthema.</li>
                        <li>Nachrichten sind Ende-zu-Ende verschlüsselt; ein verlorenes Passwort
                        kann alte Nachrichten unwiederbringlich unlesbar machen.</li>
                        <li>Abwesenheiten hinterlegen Sie im Profil, damit keine Anfrage liegen
                        bleibt.</li>
                        <li>Der Einladungslink ist 30 Tage gültig.</li>
                        </ul>
                        <blockquote>Bitte antworten Sie nicht auf diese E-Mail. Sie wurde
                        automatisch erzeugt.</blockquote>
                        <p>Wir freuen uns auf die Zusammenarbeit.</p>""")
                    .active(true)
                    .build()));

    when(templateRepository.findById(SHORT_TEMPLATE_ID))
        .thenReturn(
            Optional.of(
                InviteEmailTemplate.builder()
                    .id(SHORT_TEMPLATE_ID)
                    .kind(InviteEmailTemplateKind.TENANT_INVITE)
                    .name("Träger-Einladung (kurz)")
                    .language("de")
                    .subject("Ihre Einladung")
                    .body("Hallo {{firstName}}, bitte richten Sie Ihren Zugang ein.")
                    .active(true)
                    .build()));
  }
}
