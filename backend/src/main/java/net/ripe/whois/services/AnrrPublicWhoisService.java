package net.ripe.whois.services;

import net.ripe.db.whois.api.rest.domain.Attribute;
import net.ripe.db.whois.api.rest.domain.WhoisObject;
import net.ripe.db.whois.api.rest.domain.WhoisResources;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AnrrPublicWhoisService implements WhoisServiceBase {

    public static final String SOURCE = "TEST";
    private static final Logger LOGGER = LoggerFactory.getLogger(AnrrPublicWhoisService.class);
    private static final Set<String> RESOURCE_TYPES = Set.of("aut-num", "inetnum", "inet6num");

    private final RestTemplate restTemplate;
    private final String apiUrl;

    @Autowired
    public AnrrPublicWhoisService(
            final RestTemplate restTemplate,
            @Value("${rest.api.ripeUrl}") final String apiUrl) {
        this.restTemplate = restTemplate;
        this.apiUrl = apiUrl;
    }

    public ResourceOverview findResources(final String organisationId, final String requestedType) {
        final String type = normaliseType(requestedType);
        final URI uri = UriComponentsBuilder.fromHttpUrl(apiUrl)
                .path("/search")
                .queryParam("source", SOURCE)
                .queryParam("query-string", organisationId)
                .queryParam("inverse-attribute", "org")
                .queryParam("type-filter", "aut-num")
                .queryParam("type-filter", "inetnum")
                .queryParam("type-filter", "inet6num")
                .queryParam("flags", "B")
                .queryParam("ignore404", "true")
                .queryParam("limit", "1000")
                .build()
                .encode()
                .toUri();

        final ResponseEntity<WhoisResources> response;
        try {
            response = restTemplate.exchange(uri, HttpMethod.GET, getRequestEntity(java.util.Optional.empty()), WhoisResources.class);
        } catch (org.springframework.web.client.RestClientException exception) {
            LOGGER.warn("Authoritative Whois resource search failed for {}: {}", organisationId, exception.getMessage());
            throw new AuthoritativeWhoisUnavailableException("Authoritative Whois is unavailable", exception);
        }

        if (response.getStatusCode() != HttpStatus.OK) {
            throw new AuthoritativeWhoisUnavailableException(
                    "Authoritative Whois returned HTTP " + response.getStatusCode().value());
        }

        final List<ResourceSummary> resources = response.hasBody() && response.getBody() != null
                ? response.getBody().getWhoisObjects().stream()
                .filter(object -> type.equals(getObjectType(object)))
                .map(this::toSummary)
                .toList()
                : List.of();

        return new ResourceOverview(resources, resources.size());
    }

    private String normaliseType(final String requestedType) {
        final String type = requestedType == null ? "" : requestedType.trim().toLowerCase(Locale.ROOT);
        if (!RESOURCE_TYPES.contains(type)) {
            throw new InvalidResourceRequestException("unsupported resource type");
        }
        return type;
    }

    private ResourceSummary toSummary(final WhoisObject object) {
        final String type = getObjectType(object);
        final String resource = getObjectSinglePrimaryKey(object);
        return new ResourceSummary(
                resource,
                type,
                getAttribute(object, "status"),
                getAttribute(object, "netname"),
                getAttribute(object, "as-name"));
    }

    private String getAttribute(final WhoisObject object, final String name) {
        return object.getAttributes().stream()
                .filter(attribute -> name.equals(attribute.getName()))
                .map(Attribute::getValue)
                .findFirst()
                .orElse(null);
    }

    public record ResourceOverview(List<ResourceSummary> resources, int filteredSize) {
    }

    public record ResourceSummary(
            String resource,
            String type,
            String status,
            String netname,
            String asname) {
    }
}
