package net.ripe.whois.services;

import net.ripe.whois.web.api.whois.domain.UserInfoResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class AccountCompatibilityService {

    private final AuthenticatedOidcIdentityService identityService;
    private final AccountMembershipRepository membershipRepository;
    private final WhoisInternalService whoisInternalService;

    public AccountCompatibilityService(
            final AuthenticatedOidcIdentityService identityService,
            final AccountMembershipRepository membershipRepository,
            final WhoisInternalService whoisInternalService) {
        this.identityService = identityService;
        this.membershipRepository = membershipRepository;
        this.whoisInternalService = whoisInternalService;
    }

    public UserInfoResponse getUserInfo() {
        final AuthenticatedOidcIdentityService.Identity identity = identityService.requireCurrentIdentity();
        final List<AccountMembershipRepository.OrganisationMembership> memberships =
                membershipRepository.findByKeycloakUuid(identity.uuid());

        final UserInfoResponse response = new UserInfoResponse();
        response.user = new UserInfoResponse.User();
        response.user.uuid = identity.uuid();
        response.user.email = identity.email();
        response.user.username = identity.username();
        response.user.displayName = identity.displayName();
        response.user.active = true;
        response.organisations = toOrganisations(memberships);
        response.members = List.of();
        return response;
    }

    public List<Map<String, Object>> getMaintainers() {
        final AuthenticatedOidcIdentityService.Identity identity = identityService.requireCurrentIdentity();
        return whoisInternalService.getSsoMaintainers(identity.uuid());
    }

    /**
     * Resolves a browser-selected organisation only after checking the mapping
     * for the authenticated Keycloak identity.  The mapping is account context;
     * it never grants registry rights.
     */
    public String requireOrganisation(final String requestedOrganisationId) {
        if (requestedOrganisationId == null || requestedOrganisationId.isBlank()) {
            throw new InvalidResourceRequestException("organisation id is required");
        }

        final String organisationId = requestedOrganisationId.trim();
        final AuthenticatedOidcIdentityService.Identity identity = identityService.requireCurrentIdentity();
        return membershipRepository.findByKeycloakUuid(identity.uuid()).stream()
                .map(AccountMembershipRepository.OrganisationMembership::orgObjectId)
                .filter(Objects::nonNull)
                .filter(organisationId::equals)
                .findFirst()
                .orElseThrow(() -> new OrganisationAccessDeniedException(organisationId));
    }

    private List<UserInfoResponse.Organisation> toOrganisations(
            final List<AccountMembershipRepository.OrganisationMembership> memberships) {
        final Map<String, UserInfoResponse.Organisation> byObjectId = new LinkedHashMap<>();
        for (final AccountMembershipRepository.OrganisationMembership membership : memberships) {
            final UserInfoResponse.Organisation organisation = byObjectId.computeIfAbsent(
                    membership.orgObjectId(), key -> {
                        final UserInfoResponse.Organisation value = new UserInfoResponse.Organisation();
                        value.orgObjectId = key;
                        // The mapping store deliberately has no registry/business data.
                        // Use the stable object id as the transparent UI label.
                        value.organisationName = key;
                        value.roles = new ArrayList<>();
                        return value;
                    });
            if (membership.role() != null && !organisation.roles.contains(membership.role())) {
                organisation.roles.add(membership.role());
            }
        }
        return List.copyOf(byObjectId.values());
    }
}
