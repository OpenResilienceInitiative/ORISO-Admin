// Runs against the real UserService classes; compilation/output stay in task state.
import com.fasterxml.jackson.databind.ObjectMapper;
import de.caritas.cob.userservice.api.port.out.InviteEmailTemplateRepository;
import de.caritas.cob.userservice.api.service.accountinvite.*;
import de.caritas.cob.userservice.api.service.accountinvite.mail.*;
import de.caritas.cob.userservice.api.service.email.PlatformSmtpSettingsProvider;
import de.caritas.cob.userservice.api.service.email.layout.EmailBranding;
import de.caritas.cob.userservice.api.service.email.layout.EmailBrandingResolver;
import de.caritas.cob.userservice.api.service.notification.*;
import java.nio.file.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

public class InvitePreviewStoryFixtureGenerator {
  public static void main(String[] args) throws Exception {
    var mapper = new ObjectMapper();
    var branding = mock(EmailBrandingResolver.class);
    when(branding.resolvePendingTenant(nullable(Long.class))).thenReturn(new EmailBranding(
        "Online-Beratung", null, "#a5000a", "https://app.example.org/impressum", "https://app.example.org/datenschutz"));
    var dispatcher = new InviteMailDispatchService(
        mock(PlatformSmtpSettingsProvider.class), mock(InviteMailTransport.class),
        InviteFrameMailRendererFixture.inviteFrameMailRenderer(branding),
        mock(TenantSystemEmailRouteService.class), mock(TenantSystemEmailClient.class));
    var preview = new InviteEmailPreviewService(mock(InviteEmailTemplateRepository.class),
        mock(AccountInviteAccessPolicy.class),
        new InviteAcceptUrlBuilder("https://app.example.org", "https://admin.example.org"),
        dispatcher, new AdminPanelUrl("https://admin.example.org"));
    var fixtures = new ArrayList<Object>();
    for (var entry : mapper.readTree(Path.of(args[0]).toFile())) {
      var request = entry.get("request");
      var kind = request.has("kind") ? InviteEmailTemplateKind.valueOf(request.get("kind").asText()) : null;
      var result = preview.preview(new InviteEmailPreviewService.PreviewCommand(
          null, kind, request.get("subject").asText(), request.get("body").asText(), null, request.get("language").asText()));
      fixtures.add(Map.of("id", entry.get("id").asText(), "request", request, "response", result));
    }
    mapper.writerWithDefaultPrettyPrinter().writeValue(Path.of(args[1]).toFile(), fixtures);
  }
}
