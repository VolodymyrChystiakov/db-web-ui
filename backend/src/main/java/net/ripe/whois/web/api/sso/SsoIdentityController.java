package net.ripe.whois.web.api.sso;

import net.ripe.whois.services.KeycloakIdentityService;
import net.ripe.whois.services.WhoisServiceBase;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Optional;

@RestController
@RequestMapping("/accounts")
public class SsoIdentityController {

    private final KeycloakIdentityService identityService;
    private final String apiKey;

    @Autowired
    public SsoIdentityController(
            final KeycloakIdentityService identityService,
            @Value("${internal.api.key:}") final String apiKey) {
        this.identityService = identityService;
        this.apiKey = apiKey;
    }

    @GetMapping(path = "/email/{email:.+}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SsoAccountResponse> getByEmail(
            @PathVariable final String email,
            @RequestHeader(name = WhoisServiceBase.API_KEY_HEADER, required = false) final String suppliedApiKey) {
        if (!isAuthorized(suppliedApiKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return accountResponse(identityService.findByEmail(email));
    }

    @GetMapping(path = "/{uuid:.+}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SsoAccountResponse> getByUuid(
            @PathVariable final String uuid,
            @RequestHeader(name = WhoisServiceBase.API_KEY_HEADER, required = false) final String suppliedApiKey) {
        if (!isAuthorized(suppliedApiKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return accountResponse(identityService.findByUuid(uuid));
    }

    @ExceptionHandler(KeycloakIdentityService.InvalidIdentityInputException.class)
    public ResponseEntity<Void> invalidIdentityInput() {
        return ResponseEntity.badRequest().build();
    }

    @ExceptionHandler(KeycloakIdentityService.KeycloakUnavailableException.class)
    public ResponseEntity<Void> keycloakUnavailable() {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
    }

    private ResponseEntity<SsoAccountResponse> accountResponse(
            final Optional<KeycloakIdentityService.IdentityAccount> account) {
        return account
                .map(SsoAccountResponse::of)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private boolean isAuthorized(final String suppliedApiKey) {
        if (apiKey == null || apiKey.isBlank() || suppliedApiKey == null) {
            return false;
        }
        return MessageDigest.isEqual(
                apiKey.getBytes(StandardCharsets.UTF_8),
                suppliedApiKey.getBytes(StandardCharsets.UTF_8));
    }
}
