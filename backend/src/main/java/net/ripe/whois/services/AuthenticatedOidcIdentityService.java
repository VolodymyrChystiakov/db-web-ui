package net.ripe.whois.services;

import org.apache.commons.lang3.StringUtils;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthenticatedOidcIdentityService {

    private static final String RIPE_USER_ID_CLAIM = "ripe_user_id";

    public Identity requireCurrentIdentity() {
        final Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof OidcUser user)) {
            throw new UnauthenticatedException();
        }

        final String stableId = StringUtils.defaultIfBlank(
                user.getClaimAsString(RIPE_USER_ID_CLAIM), user.getSubject());
        final String uuid = canonicalUuid(stableId);
        final String email = StringUtils.trimToNull(user.getEmail());
        if (email == null) {
            throw new InvalidIdentityException("Authenticated OIDC principal has no email claim");
        }

        final String displayName = firstNonBlank(
                user.getFullName(),
                user.getClaimAsString("name"),
                user.getPreferredUsername(),
                email);
        final String username = firstNonBlank(user.getPreferredUsername(), email);
        return new Identity(uuid, email, username, displayName);
    }

    private static String canonicalUuid(final String value) {
        if (StringUtils.isBlank(value)) {
            throw new InvalidIdentityException("Authenticated OIDC principal has no stable UUID");
        }
        try {
            final UUID uuid = UUID.fromString(value);
            if (!uuid.toString().equalsIgnoreCase(value)) {
                throw new InvalidIdentityException("Authenticated OIDC principal has an invalid UUID");
            }
            return uuid.toString();
        } catch (IllegalArgumentException exception) {
            throw new InvalidIdentityException("Authenticated OIDC principal has an invalid UUID");
        }
    }

    private static String firstNonBlank(final String... values) {
        for (final String value : values) {
            final String trimmed = StringUtils.trimToNull(value);
            if (trimmed != null) {
                return trimmed;
            }
        }
        throw new InvalidIdentityException("Authenticated OIDC principal has no display data");
    }

    public record Identity(String uuid, String email, String username, String displayName) {
    }

    public static class UnauthenticatedException extends RuntimeException {
    }

    public static class InvalidIdentityException extends RuntimeException {
        public InvalidIdentityException(final String message) {
            super(message);
        }
    }
}
