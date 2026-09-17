package net.ripe.whois.services;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class KeycloakIdentityService {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@/]+@[^\\s@/]+$");
    private static final Pattern REALM = Pattern.compile("^[A-Za-z0-9._-]+$");
    private static final long TOKEN_REFRESH_MARGIN_SECONDS = 30;

    private final RestTemplate restTemplate;
    private final URI tokenUri;
    private final URI usersUri;
    private final String clientId;
    private final String clientSecret;

    private volatile CachedToken cachedToken;

    @Autowired
    public KeycloakIdentityService(
            final RestTemplate restTemplate,
            @Value("${sso.identity.keycloak.issuer-uri:${spring.security.oauth2.client.provider.keycloak.issuer-uri:}}") final String issuerUri,
            @Value("${sso.identity.keycloak.realm:ripe-ncc}") final String realm,
            @Value("${sso.identity.keycloak.client-id:}") final String clientId,
            @Value("${sso.identity.keycloak.client-secret:}") final String clientSecret,
            @Value("${sso.identity.keycloak.admin-users-url:}") final String adminUsersUrl,
            @Value("${sso.identity.keycloak.allow-insecure-http:false}") final boolean allowInsecureHttp) {
        this.restTemplate = restTemplate;
        this.clientId = clientId;
        this.clientSecret = clientSecret;

        final URI issuer = requireHttpUri(issuerUri, allowInsecureHttp);
        this.tokenUri = requireHttpUri(appendPath(issuer, "/protocol/openid-connect/token"), allowInsecureHttp);
        this.usersUri = StringUtils.isNotBlank(adminUsersUrl)
                ? requireHttpUri(adminUsersUrl, allowInsecureHttp)
                : buildAdminUsersUri(issuer, realm, allowInsecureHttp);
    }

    public Optional<IdentityAccount> findByEmail(final String email) {
        validateEmail(email);

        final URI uri = UriComponentsBuilder.fromUri(usersUri)
                .queryParam("email", email)
                .queryParam("exact", true)
                .build()
                .encode()
                .toUri();

        final ResponseEntity<List<KeycloakUser>> response;
        try {
            response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(bearerHeaders()),
                    new ParameterizedTypeReference<>() {
                    });
        } catch (RestClientException exception) {
            throw new KeycloakUnavailableException("Keycloak identity lookup failed", exception);
        }

        final List<KeycloakUser> matches = Optional.ofNullable(response.getBody())
                .orElseGet(List::of)
                .stream()
                .filter(user -> user != null && user.email() != null && user.email().equalsIgnoreCase(email))
                .toList();

        if (matches.isEmpty()) {
            return Optional.empty();
        }
        if (matches.size() > 1) {
            throw new KeycloakUnavailableException("Keycloak returned more than one exact email match");
        }
        return Optional.of(toIdentityAccount(matches.getFirst(), null));
    }

    public Optional<IdentityAccount> findByUuid(final String uuid) {
        final String canonicalUuid = validateUuid(uuid);
        final URI uri = UriComponentsBuilder.fromUri(usersUri)
                .pathSegment(canonicalUuid)
                .build()
                .toUri();

        try {
            final ResponseEntity<KeycloakUser> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(bearerHeaders()),
                    new ParameterizedTypeReference<>() {
                    });
            return Optional.of(toIdentityAccount(response.getBody(), canonicalUuid));
        } catch (HttpClientErrorException.NotFound exception) {
            return Optional.empty();
        } catch (RestClientException exception) {
            throw new KeycloakUnavailableException("Keycloak identity lookup failed", exception);
        }
    }

    private HttpHeaders bearerHeaders() {
        final HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.setBearerAuth(accessToken());
        return headers;
    }

    private String accessToken() {
        final Instant refreshAt = Instant.now().plusSeconds(TOKEN_REFRESH_MARGIN_SECONDS);
        final CachedToken current = cachedToken;
        if (current != null && current.expiresAt().isAfter(refreshAt)) {
            return current.value();
        }

        synchronized (this) {
            final CachedToken refreshed = cachedToken;
            if (refreshed != null && refreshed.expiresAt().isAfter(refreshAt)) {
                return refreshed.value();
            }

            if (StringUtils.isBlank(clientId) || StringUtils.isBlank(clientSecret)) {
                throw new KeycloakUnavailableException("Keycloak service-account credentials are not configured");
            }

            final HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            final MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "client_credentials");
            form.add("client_id", clientId);
            form.add("client_secret", clientSecret);

            final ResponseEntity<KeycloakTokenResponse> response;
            try {
                response = restTemplate.exchange(
                        tokenUri,
                        HttpMethod.POST,
                        new HttpEntity<>(form, headers),
                        KeycloakTokenResponse.class);
            } catch (RestClientException exception) {
                throw new KeycloakUnavailableException("Keycloak token request failed", exception);
            }

            final KeycloakTokenResponse body = response.getBody();
            if (body == null || StringUtils.isBlank(body.accessToken())) {
                throw new KeycloakUnavailableException("Keycloak returned no access token");
            }

            final long expiresIn = Math.max(0, body.expiresIn());
            cachedToken = new CachedToken(body.accessToken(), Instant.now().plusSeconds(expiresIn));
            return body.accessToken();
        }
    }

    private IdentityAccount toIdentityAccount(final KeycloakUser user, final String expectedUuid) {
        if (user == null || StringUtils.isBlank(user.id()) || StringUtils.isBlank(user.email())) {
            throw new KeycloakUnavailableException("Keycloak returned an incomplete user");
        }

        final String userUuid;
        try {
            userUuid = canonicalUuid(user.id());
        } catch (InvalidIdentityInputException exception) {
            throw new KeycloakUnavailableException("Keycloak returned an invalid user UUID", exception);
        }
        if (expectedUuid != null && !userUuid.equalsIgnoreCase(expectedUuid)) {
            throw new KeycloakUnavailableException("Keycloak returned a different user UUID");
        }
        return new IdentityAccount(user.id(), user.email(), Boolean.TRUE.equals(user.enabled()));
    }

    private static void validateEmail(final String email) {
        if (StringUtils.isBlank(email) || !EMAIL.matcher(email).matches()) {
            throw new InvalidIdentityInputException("Invalid email");
        }
    }

    private static String validateUuid(final String uuid) {
        if (StringUtils.isBlank(uuid)) {
            throw new InvalidIdentityInputException("Invalid UUID");
        }
        return canonicalUuid(uuid);
    }

    private static String canonicalUuid(final String uuid) {
        try {
            final UUID parsed = UUID.fromString(uuid);
            if (!parsed.toString().equalsIgnoreCase(uuid)) {
                throw new InvalidIdentityInputException("Invalid UUID");
            }
            return parsed.toString();
        } catch (IllegalArgumentException exception) {
            throw new InvalidIdentityInputException("Invalid UUID");
        }
    }

    private static URI buildAdminUsersUri(final URI issuer, final String realm, final boolean allowInsecureHttp) {
        if (StringUtils.isBlank(realm) || !REALM.matcher(realm).matches()) {
            throw new IllegalArgumentException("Invalid Keycloak realm");
        }

        final String issuerPath = stripTrailingSlash(issuer.getPath());
        final String realmMarker = "/realms/";
        final int realmIndex = issuerPath.lastIndexOf(realmMarker);
        if (realmIndex < 0 || !issuerPath.substring(realmIndex + realmMarker.length()).equals(realm)) {
            throw new IllegalArgumentException("Keycloak issuer must end with /realms/{realm}");
        }

        final String basePath = issuerPath.substring(0, realmIndex);
        final String usersPath = basePath + "/admin/realms/" + realm + "/users";
        try {
            return requireHttpUri(new URI(issuer.getScheme(), issuer.getAuthority(), usersPath, null, null).toString(), allowInsecureHttp);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid Keycloak admin users URL", exception);
        }
    }

    private static URI requireHttpUri(final String value, final boolean allowInsecureHttp) {
        if (StringUtils.isBlank(value)) {
            throw new IllegalArgumentException("Keycloak URL is not configured");
        }
        try {
            final URI uri = URI.create(value);
            final boolean https = "https".equalsIgnoreCase(uri.getScheme());
            final boolean allowedHttp = allowInsecureHttp && "http".equalsIgnoreCase(uri.getScheme());
            if ((!https && !allowedHttp) || uri.getHost() == null || uri.getUserInfo() != null) {
                throw new IllegalArgumentException("Keycloak URLs must use HTTPS");
            }
            return uri;
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid Keycloak URL", exception);
        }
    }

    private static String appendPath(final URI uri, final String suffix) {
        return stripTrailingSlash(uri.toString()) + suffix;
    }

    private static String stripTrailingSlash(final String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    public record IdentityAccount(String id, String email, boolean active) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KeycloakUser(String id, String email, Boolean enabled) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KeycloakTokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in") long expiresIn) {
    }

    private record CachedToken(String value, Instant expiresAt) {
    }

    public static class InvalidIdentityInputException extends RuntimeException {
        public InvalidIdentityInputException(final String message) {
            super(message);
        }
    }

    public static class KeycloakUnavailableException extends RuntimeException {
        public KeycloakUnavailableException(final String message) {
            super(message);
        }

        public KeycloakUnavailableException(final String message, final Throwable cause) {
            super(message, cause);
        }
    }
}
