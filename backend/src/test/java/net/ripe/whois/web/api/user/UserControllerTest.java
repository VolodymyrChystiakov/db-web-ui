package net.ripe.whois.web.api.user;

import net.ripe.db.whois.api.rest.client.RestClientException;
import net.ripe.whois.services.AccountCompatibilityService;
import net.ripe.whois.services.AccountStoreUnavailableException;
import net.ripe.whois.services.AnrrPublicWhoisService;
import net.ripe.whois.services.AuthenticatedOidcIdentityService;
import net.ripe.whois.services.InvalidResourceRequestException;
import net.ripe.whois.services.OrganisationAccessDeniedException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserControllerTest {

    @Test
    void mntnersReturnsTheSmallCompactDtoFromTheServerDerivedIdentity() {
        final AccountCompatibilityService service = mock(AccountCompatibilityService.class);
        final List<Map<String, Object>> response = List.of(Map.of(
                "key", "ALICE-MNT", "type", "mntner", "auth", List.of("SSO"), "mine", true));
        when(service.getMaintainers()).thenReturn(response);

        final ResponseEntity<?> result = new UserController(service).getMaintainersCompact();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(response, result.getBody());
    }

    @Test
    void unauthenticatedMntnerLookupCannotBeUsedForEnumeration() {
        final AccountCompatibilityService service = mock(AccountCompatibilityService.class);
        when(service.getMaintainers()).thenThrow(new AuthenticatedOidcIdentityService.UnauthenticatedException());

        final ResponseEntity<?> result = new UserController(service).getMaintainersCompact();

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void accountDatabaseOutageFailsClosed() {
        final AccountCompatibilityService service = mock(AccountCompatibilityService.class);
        when(service.getUserInfo()).thenThrow(new AccountStoreUnavailableException("down", new IllegalStateException()));

        final ResponseEntity<?> result = new UserController(service).getUserInfo();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
    }

    @Test
    void whoisFailureDoesNotBecomeASuccessfulEmptyResult() {
        final AccountCompatibilityService service = mock(AccountCompatibilityService.class);
        when(service.getMaintainers()).thenThrow(new RestClientException(502, "Whois unavailable"));

        final ResponseEntity<?> result = new UserController(service).getMaintainersCompact();

        assertEquals(HttpStatus.BAD_GATEWAY, result.getStatusCode());
    }

    @Test
    void resourcesRequireAnAuthenticatedOrganisationMapping() {
        final AccountCompatibilityService accountService = mock(AccountCompatibilityService.class);
        final AnrrPublicWhoisService whoisService = mock(AnrrPublicWhoisService.class);
        final AnrrPublicWhoisService.ResourceOverview overview = new AnrrPublicWhoisService.ResourceOverview(List.of(), 0);
        when(accountService.requireOrganisation("ORG-ANRR")).thenReturn("ORG-ANRR");
        when(whoisService.findResources("ORG-ANRR", "aut-num")).thenReturn(overview);

        final ResponseEntity<?> result = new UserController(accountService, whoisService).getResources("ORG-ANRR", "aut-num");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(overview, result.getBody());
    }

    @Test
    void resourcesDoNotAllowAnotherOrganisationToBeEnumerated() {
        final AccountCompatibilityService accountService = mock(AccountCompatibilityService.class);
        final AnrrPublicWhoisService whoisService = mock(AnrrPublicWhoisService.class);
        when(accountService.requireOrganisation("ORG-OTHER")).thenThrow(new OrganisationAccessDeniedException("ORG-OTHER"));

        final ResponseEntity<?> result = new UserController(accountService, whoisService).getResources("ORG-OTHER", "aut-num");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        org.mockito.Mockito.verifyNoInteractions(whoisService);
    }

    @Test
    void resourcesMapBadRequestsAndUpstreamFailuresExplicitly() {
        final AccountCompatibilityService accountService = mock(AccountCompatibilityService.class);
        final AnrrPublicWhoisService whoisService = mock(AnrrPublicWhoisService.class);
        when(accountService.requireOrganisation(" ")).thenThrow(new InvalidResourceRequestException("organisation id is required"));
        assertEquals(HttpStatus.BAD_REQUEST, new UserController(accountService, whoisService)
                .getResources(" ", "inetnum").getStatusCode());

        when(accountService.requireOrganisation("ORG-ANRR")).thenReturn("ORG-ANRR");
        when(whoisService.findResources("ORG-ANRR", "inetnum"))
                .thenThrow(new net.ripe.whois.services.AuthoritativeWhoisUnavailableException("down"));
        assertEquals(HttpStatus.BAD_GATEWAY, new UserController(accountService, whoisService)
                .getResources("ORG-ANRR", "inetnum").getStatusCode());
    }
}
