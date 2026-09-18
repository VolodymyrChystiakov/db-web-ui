package net.ripe.whois.services;

public class OrganisationAccessDeniedException extends RuntimeException {

    public OrganisationAccessDeniedException(final String organisationId) {
        super("The authenticated user is not mapped to organisation " + organisationId);
    }
}
