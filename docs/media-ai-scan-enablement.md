# Enabling the AI media check

Issue ORISO-Admin#734, part of epic ORISO-Admin#366 phase 2, decision ADR-019.

The `featureMediaAiScan*` toggles have been switchable in this panel since July.
They control nothing, because no content scanner is deployed in any environment.
This document is the gate that has to be walked before they mean something, and
the reason the switches are disabled until then.

## Two things are being confused, so name them apart

|                           | Where                                | What it decides                                            |
| ------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `mediaScanner.enabled`    | ORISO-Helm                           | Is a content scanner deployed and in the media path at all |
| `featureMediaAiScan*`     | this panel, per tenant and chat type | Does the app ask that scanner for an **AI** verdict        |
| `MEDIA_AI_SCAN_AVAILABLE` | this app's runtime config            | Are both of the above actually possible here               |

The plain ClamAV virus scan rides on the media-inline-display family and has no
contract dependency. It ships first, and it does not need anything on this page.

## Why the toggles are disabled

Design rule: disable, don't hide. The capability exists in the product and the
client should see that it exists, so the switches stay on the card. But a switch
that moves without changing any behaviour is worse than no switch — QA reports it
as working, and the client reasonably assumes an AI check is running.

So the AI toggles render disabled with the reason next to them until
`MEDIA_AI_SCAN_AVAILABLE` is `"true"`, which is an explicit opt-in. Nothing else
in the panel is affected: upload and inline display stay switchable.

## The gate

`MEDIA_AI_SCAN_AVAILABLE` may only be set to `"true"` in an environment where
**both** of the following hold. Neither substitutes for the other.

1. **A content scanner is deployed** there — `mediaScanner.enabled: true` in the
   Helm values for that environment, with the request secret provisioned. See
   `docs/media-scanner.md` in ORISO-Helm.
2. **A zero-retention sub-processor agreement is signed and recorded.** The AI
   check sends chat images — potentially from minors, potentially intimate — to
   an external provider. Before it may run anywhere real:

    - the agreement exists in writing, with zero retention contractually
      confirmed for the account actually in use;
    - the provider is listed in the KDG/AVV sub-processor documentation;
    - the DPIA text is updated, because "no automated content check" stops being
      true on that day.

    The Helm chart enforces this half mechanically: it refuses to render unless
    `mediaScanner.aiCheck.subProcessorAgreementSigned` is `true` and the API key
    is supplied as a referenced secret. A missed checkbox fails a deploy rather
    than quietly enabling a sub-processor.

## Per-environment checklist

-   [ ] Sub-processor agreement signed, zero retention confirmed for this account
-   [ ] Provider added to the KDG/AVV sub-processor documentation
-   [ ] DPIA section on media handling updated
-   [ ] API key created as a Kubernetes secret and referenced via
        `mediaScanner.aiCheck.existingSecret` — never inline in a values file
-   [ ] `mediaScanner.aiCheck.subProcessorAgreementSigned: true` set in that
        environment's values
-   [ ] `MEDIA_AI_SCAN_AVAILABLE=true` set for this app in the same environment
-   [ ] Verified in the panel: the AI toggles are switchable and the hint is gone
-   [ ] Verified end to end: a rejected image is not retrievable, not merely hidden

## Behaviour once enabled

The check is fail-closed in every direction. Provider unreachable, timed out,
non-2xx, or any answer that is not an explicit clear result: the file is
quarantined, not released. An outage therefore makes recent images unavailable
rather than unchecked — the intended direction, and worth telling operations
before it happens rather than during.

The scan script has a single integration point with the provider, so replacing
it with a self-hosted model later changes nothing else in the pipeline. That
swap would also retire this contract gate, which is the main argument for making
it eventually.
