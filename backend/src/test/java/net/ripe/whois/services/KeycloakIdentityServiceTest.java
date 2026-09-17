package net.ripe.whois.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.Optional;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class KeycloakIdentityServiceTest {

    private static final String TOKEN_URI = "https://idp.example/realms/ripe-ncc/protocol/openid-connect/token";
    private static final String USERS_URI = "https://idp.example/admin/realms/ripe-ncc/users";
    private static final String USER_UUID = "8ffe29be-89ef-41c8-ba7f-0e1553a623e5";
    private static final String API_TOKEN = "admin-access-token";

    private RestTemplate restTemplate;
    private MockRestServiceServer mockServer;
    private KeycloakIdentityService subject;

    @BeforeEach
    void setUp() {
        restTemplate = new RestTemplate();
        mockServer = MockRestServiceServer.createServer(restTemplate);
        subject = new KeycloakIdentityService(
                restTemplate,
                "https://idp.example/realms/ripe-ncc",
                "ripe-ncc",
                "identity-adapter",
                "identity-secret",
                USERS_URI,
                false);
    }

    @Test
    void knownEmailReturnsStableUuidFromExactKeycloakMatch() {
        expectToken();
        expectEmailLookup("alice@example.com", "[{\"id\":\"" + USER_UUID + "\",\"email\":\"alice@example.com\",\"enabled\":true}]");

        final Optional<KeycloakIdentityService.IdentityAccount> account = subject.findByEmail("alice@example.com");

        assertThat(account.get().id(), is(USER_UUID));
        assertThat(account.get().email(), is("alice@example.com"));
        mockServer.verify();
    }

    @Test
    void unknownEmailReturnsEmpty() {
        expectToken();
        expectEmailLookup("unknown@example.com", "[]");

        assertThat(subject.findByEmail("unknown@example.com"), is(Optional.empty()));
        mockServer.verify();
    }

    @Test
    void knownUuidReturnsCurrentEmail() {
        expectToken();
        expectUuidLookup(USER_UUID, "{\"id\":\"" + USER_UUID + "\",\"email\":\"alice@example.com\",\"enabled\":true}");

        final Optional<KeycloakIdentityService.IdentityAccount> account = subject.findByUuid(USER_UUID);

        assertThat(account.get().email(), is("alice@example.com"));
        assertThat(account.get().id(), is(USER_UUID));
        mockServer.verify();
    }

    @Test
    void unknownUuidReturnsEmpty() {
        expectToken();
        mockServer.expect(requestTo(URI.create(USERS_URI + "/" + USER_UUID)))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + API_TOKEN))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThat(subject.findByUuid(USER_UUID), is(Optional.empty()));
        mockServer.verify();
    }

    @Test
    void malformedInputIsRejectedBeforeKeycloak() {
        assertThrows(KeycloakIdentityService.InvalidIdentityInputException.class,
                () -> subject.findByEmail("not-an-email"));
        assertThrows(KeycloakIdentityService.InvalidIdentityInputException.class,
                () -> subject.findByUuid("not-a-uuid"));

        mockServer.verify();
    }

    @Test
    void keycloakFailureIsNotReportedAsUnknownIdentity() {
        expectTokenFailure();

        assertThrows(KeycloakIdentityService.KeycloakUnavailableException.class,
                () -> subject.findByEmail("alice@example.com"));

        mockServer.verify();
    }

    @Test
    void keycloakUserLookupFailureIsNotReportedAsUnknownIdentity() {
        expectToken();
        mockServer.expect(requestTo(URI.create(USERS_URI + "?email=alice@example.com&exact=true")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + API_TOKEN))
                .andRespond(withServerError());

        assertThrows(KeycloakIdentityService.KeycloakUnavailableException.class,
                () -> subject.findByEmail("alice@example.com"));

        mockServer.verify();
    }

    @Test
    void reverseLookupReadsEmailAgainAfterEmailChangeWithoutChangingUuid() {
        expectToken();
        expectUuidLookup(USER_UUID, "{\"id\":\"" + USER_UUID + "\",\"email\":\"old@example.com\",\"enabled\":true}");
        expectUuidLookup(USER_UUID, "{\"id\":\"" + USER_UUID + "\",\"email\":\"new@example.com\",\"enabled\":true}");

        final KeycloakIdentityService.IdentityAccount first = subject.findByUuid(USER_UUID).get();
        final KeycloakIdentityService.IdentityAccount second = subject.findByUuid(USER_UUID).get();
        assertThat(first.email(), is("old@example.com"));
        assertThat(second.email(), is("new@example.com"));
        assertThat(second.id(), is(USER_UUID));
        mockServer.verify();
    }

    @Test
    void productionConfigurationRejectsHttpKeycloakEndpoints() {
        assertThrows(IllegalArgumentException.class, () -> new KeycloakIdentityService(
                restTemplate,
                "http://idp.example/realms/ripe-ncc",
                "ripe-ncc",
                "identity-adapter",
                "identity-secret",
                "http://idp.example/admin/realms/ripe-ncc/users",
                false));
    }

    private void expectToken() {
        mockServer.expect(requestTo(TOKEN_URI))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string(containsString("grant_type=client_credentials")))
                .andExpect(content().string(containsString("client_id=identity-adapter")))
                .andExpect(content().string(containsString("client_secret=identity-secret")))
                .andRespond(withSuccess(
                        "{\"access_token\":\"" + API_TOKEN + "\",\"expires_in\":300,\"token_type\":\"Bearer\"}",
                        MediaType.APPLICATION_JSON));
    }

    private void expectTokenFailure() {
        mockServer.expect(requestTo(TOKEN_URI))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withServerError());
    }

    private void expectEmailLookup(final String email, final String body) {
        mockServer.expect(requestTo(URI.create(USERS_URI + "?email=" + email + "&exact=true")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + API_TOKEN))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    private void expectUuidLookup(final String uuid, final String body) {
        mockServer.expect(requestTo(URI.create(USERS_URI + "/" + uuid)))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + API_TOKEN))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }
}
