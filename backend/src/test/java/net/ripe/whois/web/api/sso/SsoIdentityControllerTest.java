package net.ripe.whois.web.api.sso;

import net.ripe.whois.services.KeycloakIdentityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class SsoIdentityControllerTest {

    private static final String API_KEY = "whois-internal-key";
    private static final String USER_UUID = "8ffe29be-89ef-41c8-ba7f-0e1553a623e5";

    @Mock
    private KeycloakIdentityService identityService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new SsoIdentityController(identityService, API_KEY)).build();
    }

    @Test
    void knownEmailReturnsResponseContentId() throws Exception {
        when(identityService.findByEmail("alice@example.com"))
                .thenReturn(Optional.of(new KeycloakIdentityService.IdentityAccount(USER_UUID, "alice@example.com", true)));

        mockMvc.perform(get("/accounts/email/alice@example.com")
                        .header("ncc-internal-api-key", API_KEY)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.response.content.id", is(USER_UUID)))
                .andExpect(jsonPath("$.response.content.email", is("alice@example.com")));
    }

    @Test
    void unknownEmailReturnsNotFound() throws Exception {
        when(identityService.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        mockMvc.perform(get("/accounts/email/unknown@example.com")
                        .header("ncc-internal-api-key", API_KEY))
                .andExpect(status().isNotFound());
    }

    @Test
    void knownUuidReturnsCurrentEmail() throws Exception {
        when(identityService.findByUuid(USER_UUID))
                .thenReturn(Optional.of(new KeycloakIdentityService.IdentityAccount(USER_UUID, "current@example.com", true)));

        mockMvc.perform(get("/accounts/{uuid}", USER_UUID)
                        .header("ncc-internal-api-key", API_KEY)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.response.content.email", is("current@example.com")));
    }

    @Test
    void unknownUuidReturnsNotFound() throws Exception {
        when(identityService.findByUuid(USER_UUID)).thenReturn(Optional.empty());

        mockMvc.perform(get("/accounts/{uuid}", USER_UUID)
                        .header("ncc-internal-api-key", API_KEY))
                .andExpect(status().isNotFound());
    }

    @Test
    void malformedInputReturnsBadRequest() throws Exception {
        when(identityService.findByUuid("not-a-uuid"))
                .thenThrow(new KeycloakIdentityService.InvalidIdentityInputException("Invalid UUID"));

        mockMvc.perform(get("/accounts/not-a-uuid")
                        .header("ncc-internal-api-key", API_KEY))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keycloakFailureReturnsBadGateway() throws Exception {
        when(identityService.findByEmail("alice@example.com"))
                .thenThrow(new KeycloakIdentityService.KeycloakUnavailableException("Keycloak unavailable"));

        mockMvc.perform(get("/accounts/email/alice@example.com")
                        .header("ncc-internal-api-key", API_KEY))
                .andExpect(status().isBadGateway());
    }

    @Test
    void missingOrWrongApiKeyCannotUseAdapter() throws Exception {
        mockMvc.perform(get("/accounts/email/alice@example.com"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/accounts/email/alice@example.com")
                        .header("ncc-internal-api-key", "wrong"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(identityService);
    }

    @Test
    void missingConfiguredApiKeyFailsClosed() throws Exception {
        final MockMvc unconfiguredMockMvc = MockMvcBuilders
                .standaloneSetup(new SsoIdentityController(identityService, ""))
                .build();

        unconfiguredMockMvc.perform(get("/accounts/email/alice@example.com")
                        .header("ncc-internal-api-key", ""))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(identityService);
    }
}
