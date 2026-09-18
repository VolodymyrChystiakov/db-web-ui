package net.ripe.whois.services;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class JdbcAccountMembershipRepository implements AccountMembershipRepository {

    static final String FIND_MEMBERSHIPS = """
            SELECT m.org_object_id, m.`role`
              FROM membership m
              JOIN organisation o ON o.org_object_id = m.org_object_id
             WHERE m.keycloak_uuid = ?
             ORDER BY m.org_object_id, m.`role`
            """;

    private final DataSource dataSource;

    public JdbcAccountMembershipRepository(final DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<OrganisationMembership> findByKeycloakUuid(final String keycloakUuid) {
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(FIND_MEMBERSHIPS)) {
            statement.setString(1, keycloakUuid);
            try (ResultSet resultSet = statement.executeQuery()) {
                final List<OrganisationMembership> memberships = new ArrayList<>();
                while (resultSet.next()) {
                    memberships.add(new OrganisationMembership(
                            resultSet.getString("org_object_id"),
                            resultSet.getString("role")));
                }
                return memberships;
            }
        } catch (SQLException exception) {
            throw new AccountStoreUnavailableException("Account membership lookup failed", exception);
        }
    }
}
