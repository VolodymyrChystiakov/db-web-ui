package net.ripe.whois.web.api.sso;

import net.ripe.whois.services.KeycloakIdentityService;

import java.util.List;

public record SsoAccountResponse(Response response) {

    public static SsoAccountResponse of(final KeycloakIdentityService.IdentityAccount account) {
        return new SsoAccountResponse(new Response(
                200,
                "OK",
                1,
                List.of(),
                new Content(account.id(), account.email(), account.active())));
    }

    public record Response(int status, String message, int totalSize, List<String> links, Content content) {
    }

    public record Content(String id, String email, boolean active) {
    }
}
