package net.ripe.whois.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AnrrPublicWhoisServiceTest {

    private static final String API_URL = "http://localhost:8090";
    private static final String RESOURCE_SEARCH = API_URL
            + "/search?source=TEST&query-string=ORG-ANRR&inverse-attribute=org"
            + "&type-filter=aut-num&type-filter=inetnum&type-filter=inet6num"
            + "&flags=B&ignore404=true&limit=1000";

    private final RestTemplate restTemplate = new RestTemplate();
    private MockRestServiceServer mockServer;
    private AnrrPublicWhoisService subject;

    @BeforeEach
    void setUp() {
        mockServer = MockRestServiceServer.createServer(restTemplate);
        subject = new AnrrPublicWhoisService(restTemplate, API_URL);
    }

    @Test
    void inverseSearchReturnsOnlyTheRequestedAsnResources() {
        mockServer.expect(requestTo(RESOURCE_SEARCH))
                .andRespond(withSuccess(RESOURCE_XML, MediaType.APPLICATION_XML));

        final AnrrPublicWhoisService.ResourceOverview result = subject.findResources("ORG-ANRR", "aut-num");

        assertEquals(1, result.filteredSize());
        assertEquals("AS65000", result.resources().get(0).resource());
        assertEquals("aut-num", result.resources().get(0).type());
        mockServer.verify();
    }

    @Test
    void inverseSearchReturnsOnlyTheRequestedIpv4Resources() {
        mockServer.expect(requestTo(RESOURCE_SEARCH))
                .andRespond(withSuccess(RESOURCE_XML, MediaType.APPLICATION_XML));

        final AnrrPublicWhoisService.ResourceOverview result = subject.findResources("ORG-ANRR", "inetnum");

        assertEquals(1, result.filteredSize());
        assertEquals("192.0.2.0 - 192.0.2.255", result.resources().get(0).resource());
        mockServer.verify();
    }

    @Test
    void inverseSearchReturnsOnlyTheRequestedIpv6Resources() {
        mockServer.expect(requestTo(RESOURCE_SEARCH))
                .andRespond(withSuccess(RESOURCE_XML, MediaType.APPLICATION_XML));

        final AnrrPublicWhoisService.ResourceOverview result = subject.findResources("ORG-ANRR", "inet6num");

        assertEquals(1, result.filteredSize());
        assertEquals("2001:db8::/32", result.resources().get(0).resource());
        mockServer.verify();
    }

    @Test
    void unsupportedTypeIsRejectedWithoutAWhoisCall() {
        assertThrows(InvalidResourceRequestException.class, () -> subject.findResources("ORG-ANRR", "route"));
    }

    private static final String RESOURCE_XML = """
            <?xml version="1.0" encoding="UTF-8"?>
            <whois-resources xmlns:xlink="http://www.w3.org/1999/xlink">
              <objects>
                <object type="aut-num">
                  <source id="TEST"/>
                  <primary-key><attribute name="aut-num" value="AS65000"/></primary-key>
                  <attributes>
                    <attribute name="aut-num" value="AS65000"/>
                    <attribute name="org" value="ORG-ANRR"/>
                    <attribute name="as-name" value="ANRR-AS"/>
                    <attribute name="status" value="ASSIGNED"/>
                  </attributes>
                </object>
                <object type="inetnum">
                  <source id="TEST"/>
                  <primary-key><attribute name="inetnum" value="192.0.2.0 - 192.0.2.255"/></primary-key>
                  <attributes>
                    <attribute name="inetnum" value="192.0.2.0 - 192.0.2.255"/>
                    <attribute name="org" value="ORG-ANRR"/>
                    <attribute name="netname" value="ANRR-V4"/>
                    <attribute name="status" value="ASSIGNED PA"/>
                  </attributes>
                </object>
                <object type="inet6num">
                  <source id="TEST"/>
                  <primary-key><attribute name="inet6num" value="2001:db8::/32"/></primary-key>
                  <attributes>
                    <attribute name="inet6num" value="2001:db8::/32"/>
                    <attribute name="org" value="ORG-ANRR"/>
                    <attribute name="status" value="ASSIGNED"/>
                  </attributes>
                </object>
              </objects>
            </whois-resources>
            """;
}
