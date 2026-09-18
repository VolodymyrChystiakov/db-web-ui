package net.ripe.whois.services;

import java.util.List;

/**
 * Read-only account context used by the browser compatibility endpoints.
 *
 * <p>The mappings returned here are not used by Whois authorization. Whois
 * remains the source of truth for registry access.</p>
 */
public interface AccountMembershipRepository {

    List<OrganisationMembership> findByKeycloakUuid(String keycloakUuid);

    record OrganisationMembership(String orgObjectId, String role) {
    }
}
