package net.ripe.whois.services;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthenticatedOidcIdentityServiceTest {

    private static final String RIPE_USER_ID = "8ffe29be-89ef-41c8-ba7f-0e1553a623e5";

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void ripeUserIdClaimIsTheStableIdentityKey() {
        final OidcUser user = mockUser(RIPE_USER_ID, "different-subject");
        authenticate(user);

        final AuthenticatedOidcIdentityService.Identity identity =
                new AuthenticatedOidcIdentityService().requireCurrentIdentity();

        assertEquals(RIPE_USER_ID, identity.uuid());
        assertEquals("alice@example.com", identity.email());
        assertEquals("Alice Example", identity.displayName());
    }

    @Test
    void subjectIsUsedWhenKeycloakDoesNotAddTheCompatibilityClaim() {
        final OidcUser user = mockUser(null, RIPE_USER_ID);
        authenticate(user);

        assertEquals(RIPE_USER_ID,
                new AuthenticatedOidcIdentityService().requireCurrentIdentity().uuid());
    }

    @Test
    void malformedOrMissingIdentityCannotReachAccountServices() {
        final OidcUser malformed = mockUser("not-a-uuid", "subject");
        authenticate(malformed);
        assertThrows(AuthenticatedOidcIdentityService.InvalidIdentityException.class,
                () -> new AuthenticatedOidcIdentityService().requireCurrentIdentity());

        SecurityContextHolder.clearContext();
        assertThrows(AuthenticatedOidcIdentityService.UnauthenticatedException.class,
                () -> new AuthenticatedOidcIdentityService().requireCurrentIdentity());
    }

    private static OidcUser mockUser(final String ripeUserId, final String subject) {
        final OidcUser user = mock(OidcUser.class);
        when(user.getClaimAsString("ripe_user_id")).thenReturn(ripeUserId);
        when(user.getSubject()).thenReturn(subject);
        when(user.getEmail()).thenReturn("alice@example.com");
        when(user.getFullName()).thenReturn("Alice Example");
        when(user.getPreferredUsername()).thenReturn("alice");
        return user;
    }

    private static void authenticate(final OidcUser user) {
        final TestingAuthenticationToken authentication = new TestingAuthenticationToken(user, "credentials");
        authentication.setAuthenticated(true);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
