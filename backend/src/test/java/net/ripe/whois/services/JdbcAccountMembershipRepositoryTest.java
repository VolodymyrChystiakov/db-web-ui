package net.ripe.whois.services;

import org.junit.jupiter.api.Test;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JdbcAccountMembershipRepositoryTest {

    private static final String USER_UUID = "8ffe29be-89ef-41c8-ba7f-0e1553a623e5";

    @Test
    void readsOnlyTheAuthenticatedUuidMapping() throws Exception {
        final DataSource dataSource = mock(DataSource.class);
        final Connection connection = mock(Connection.class);
        final PreparedStatement statement = mock(PreparedStatement.class);
        final ResultSet resultSet = mock(ResultSet.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(resultSet);
        when(resultSet.next()).thenReturn(true, true, false);
        when(resultSet.getString("org_object_id")).thenReturn("ORG-ONE-ANRR", "ORG-TWO-ANRR");
        when(resultSet.getString("role")).thenReturn("editor", "viewer");

        final List<AccountMembershipRepository.OrganisationMembership> result =
                new JdbcAccountMembershipRepository(dataSource).findByKeycloakUuid(USER_UUID);

        assertEquals(List.of(
                new AccountMembershipRepository.OrganisationMembership("ORG-ONE-ANRR", "editor"),
                new AccountMembershipRepository.OrganisationMembership("ORG-TWO-ANRR", "viewer")), result);
        verify(statement).setString(1, USER_UUID);
    }

    @Test
    void databaseFailureIsNotConvertedToAnEmptyMapping() throws Exception {
        final DataSource dataSource = mock(DataSource.class);
        when(dataSource.getConnection()).thenThrow(new SQLException("database unavailable"));

        assertThrows(AccountStoreUnavailableException.class,
                () -> new JdbcAccountMembershipRepository(dataSource).findByKeycloakUuid(USER_UUID));
    }
}
