package net.ripe.whois.web.api.user;

import net.ripe.db.whois.api.rest.client.RestClientException;
import net.ripe.whois.services.AccountCompatibilityService;
import net.ripe.whois.services.AccountStoreUnavailableException;
import net.ripe.whois.services.AnrrPublicWhoisService;
import net.ripe.whois.services.AuthoritativeWhoisUnavailableException;
import net.ripe.whois.services.AuthenticatedOidcIdentityService;
import net.ripe.whois.services.InvalidResourceRequestException;
import net.ripe.whois.services.OrganisationAccessDeniedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@SuppressWarnings("UnusedDeclaration")
public class UserController {

    private final AccountCompatibilityService accountCompatibilityService;
    private final AnrrPublicWhoisService anrrPublicWhoisService;

    @Autowired
    public UserController(final AccountCompatibilityService accountCompatibilityService,
                          final AnrrPublicWhoisService anrrPublicWhoisService) {
        this.accountCompatibilityService = accountCompatibilityService;
        this.anrrPublicWhoisService = anrrPublicWhoisService;
    }

    /** Constructor retained for focused controller tests that do not exercise resources. */
    public UserController(final AccountCompatibilityService accountCompatibilityService) {
        this(accountCompatibilityService, null);
    }

    @RequestMapping(value = "/mntners", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getMaintainersCompact() {
        try {
            final List<Map<String, Object>> response = accountCompatibilityService.getMaintainers();

            // Make sure essentials content-type is set
            final MultiValueMap<String, String> headers = new HttpHeaders();
            headers.set(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);

            return new ResponseEntity<>(response, headers, HttpStatus.OK);

        } catch (AuthenticatedOidcIdentityService.UnauthenticatedException
                 | AuthenticatedOidcIdentityService.InvalidIdentityException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (RestClientException exception) {
            // Do not expose the internal Whois error body to the browser.
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    @RequestMapping(value = "/info", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getUserInfo() {
        try {
            return ResponseEntity.ok(accountCompatibilityService.getUserInfo());
        } catch (AuthenticatedOidcIdentityService.UnauthenticatedException
                 | AuthenticatedOidcIdentityService.InvalidIdentityException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (net.ripe.whois.services.AccountStoreUnavailableException exception) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
    }

    @RequestMapping(value = "/resources", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getResources(
            @RequestParam("org-id") final String organisationId,
            @RequestParam("type") final String resourceType) {
        try {
            final String authorisedOrganisation = accountCompatibilityService.requireOrganisation(organisationId);
            return ResponseEntity.ok(anrrPublicWhoisService.findResources(authorisedOrganisation, resourceType));
        } catch (AuthenticatedOidcIdentityService.UnauthenticatedException
                 | AuthenticatedOidcIdentityService.InvalidIdentityException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (InvalidResourceRequestException exception) {
            return ResponseEntity.badRequest().build();
        } catch (OrganisationAccessDeniedException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (AccountStoreUnavailableException exception) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        } catch (AuthoritativeWhoisUnavailableException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }
}
