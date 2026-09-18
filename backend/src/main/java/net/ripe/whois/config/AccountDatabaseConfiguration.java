package net.ripe.whois.config;

import net.ripe.whois.services.AccountMembershipRepository;
import net.ripe.whois.services.JdbcAccountMembershipRepository;
import net.ripe.whois.services.AccountStoreUnavailableException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.mariadb.jdbc.MariaDbDataSource;

import javax.sql.DataSource;

@Configuration
@EnableConfigurationProperties(AccountDatabaseConfiguration.Properties.class)
public class AccountDatabaseConfiguration {

    @Bean
    @ConditionalOnProperty(prefix = "anrr.account-db", name = "url")
    public DataSource accountDataSource(final Properties properties) {
        try {
            final MariaDbDataSource dataSource = new MariaDbDataSource();
            dataSource.setUrl(properties.url());
            dataSource.setUser(properties.username());
            dataSource.setPassword(properties.password());
            return dataSource;
        } catch (java.sql.SQLException exception) {
            throw new IllegalStateException("Invalid account database configuration", exception);
        }
    }

    @Bean
    @ConditionalOnProperty(prefix = "anrr.account-db", name = "url")
    public AccountMembershipRepository jdbcAccountMembershipRepository(final DataSource accountDataSource) {
        return new JdbcAccountMembershipRepository(accountDataSource);
    }

    @Bean
    @ConditionalOnMissingBean(AccountMembershipRepository.class)
    public AccountMembershipRepository unavailableAccountMembershipRepository() {
        return keycloakUuid -> {
            throw new AccountStoreUnavailableException("Account database is not configured");
        };
    }

    @ConfigurationProperties(prefix = "anrr.account-db")
    public record Properties(String url, String username, String password) {
    }
}
