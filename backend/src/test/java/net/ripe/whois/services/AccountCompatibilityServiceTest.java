package net.ripe.whois.services;

import net.ripe.whois.web.api.whois.domain.UserInfoResponse;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AccountCompatibilityServiceTest {

    private static final String USER_UUID = "8ffe29be-89ef-41c8-ba7f-0e1553a623e5";

    private final AuthenticatedOidcIdentityService identityService = mock(AuthenticatedOidcIdentityService.class);
    private final AccountMembershipRepository membershipRepository = mock(AccountMembershipRepository.class);
    private final WhoisInternalService whoisInternalService = mock(WhoisInternalService.class);
    private final AccountCompatibilityService subject =
            new AccountCompatibilityService(identityService, membershipRepository, whoisInternalService);

    @Test
    void userInfoContainsOidcIdentityAndOnlyMappedOrganisationContext() {
        when(identityService.requireCurrentIdentity()).thenReturn(
                new AuthenticatedOidcIdentityService.Identity(USER_UUID, "alice@example.com", "alice", "Alice Example"));
        when(membershipRepository.findByKeycloakUuid(USER_UUID)).thenReturn(List.of(
                new AccountMembershipRepository.OrganisationMembership("ORG-ONE-ANRR", "editor"),
                new AccountMembershipRepository.OrganisationMembership("ORG-ONE-ANRR", "viewer"),
                new AccountMembershipRepository.OrganisationMembership("ORG-TWO-ANRR", "viewer")));

        final UserInfoResponse response = subject.getUserInfo();

        assertEquals(USER_UUID, response.user.uuid);
        assertEquals("alice@example.com", response.user.email);
        assertEquals("Alice Example", response.user.displayName);
        assertEquals(2, response.organisations.size());
        assertEquals("ORG-ONE-ANRR", response.organisations.get(0).orgObjectId);
        assertEquals(List.of("editor", "viewer"), response.organisations.get(0).roles);
        assertEquals(List.of(), response.members);
        verify(membershipRepository).findByKeycloakUuid(USER_UUID);
    }

    @Test
    void maintainersUseTheAuthenticatedUuidAndDoNotAcceptAQueryUuid() {
        when(identityService.requireCurrentIdentity()).thenReturn(
                new AuthenticatedOidcIdentityService.Identity(USER_UUID, "alice@example.com", "alice", "Alice Example"));
        final List<Map<String, Object>> maintainers = List.of(Map.of(
                "key", "ALICE-MNT", "type", "mntner", "auth", List.of("SSO"), "mine", true));
        when(whoisInternalService.getSsoMaintainers(USER_UUID)).thenReturn(maintainers);

        assertEquals(maintainers, subject.getMaintainers());
        verify(whoisInternalService).getSsoMaintainers(USER_UUID);
    }

    @Test
    void accountDatabaseFailureIsPropagatedForFailClosedHandling() {
        when(identityService.requireCurrentIdentity()).thenReturn(
                new AuthenticatedOidcIdentityService.Identity(USER_UUID, "alice@example.com", "alice", "Alice Example"));
        when(membershipRepository.findByKeycloakUuid(USER_UUID))
                .thenThrow(new AccountStoreUnavailableException("down", new IllegalStateException()));

        assertThrows(AccountStoreUnavailableException.class, subject::getUserInfo);
    }
}
