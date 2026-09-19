import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ResourcesDataService } from '../../../src/app/myresources/resources-data.service';

describe('ResourcesDataService', () => {
    let resourcesDataService: ResourcesDataService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ResourcesDataService, provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        httpMock = TestBed.inject(HttpTestingController);
        resourcesDataService = TestBed.inject(ResourcesDataService);
    });

    afterEach(() => httpMock.verify());

    it('loads the ASN list through the authenticated account compatibility endpoint', () => {
        const response = {
            filteredSize: 1,
            resources: [{ resource: 'AS65000', type: 'aut-num', status: 'ASSIGNED', asname: 'ANRR-AS' }],
        };
        resourcesDataService.fetchResources('ORG-ANRR', 'aut-num').subscribe((result) => expect(result).toBe(response));

        const request = httpMock.expectOne({ method: 'GET', url: 'api/user/resources?org-id=ORG-ANRR&type=aut-num' });
        request.flush(response);
    });

    it('keeps the complete authoritative object returned by public TEST Whois', () => {
        const whoisObject = {
            type: 'inetnum',
            source: { id: 'test' },
            'primary-key': { attribute: [{ name: 'inetnum', value: '192.0.2.0 - 192.0.2.255' }] },
            attributes: {
                attribute: [
                    { name: 'inetnum', value: '192.0.2.0 - 192.0.2.255' },
                    { name: 'sponsoring-org', value: 'ORG-EXAMPLE' },
                    { name: 'remarks', value: 'original' },
                ],
            },
        };
        resourcesDataService.fetchResource('192.0.2.0 - 192.0.2.255', 'inetnum').subscribe((result) => {
            expect(result.object).toEqual(whoisObject);
            expect(result.object.attributes.attribute).toEqual(whoisObject.attributes.attribute);
        });

        const request = httpMock.expectOne((candidate) => candidate.url === 'api/whois/search');
        expect(request.request.params.get('source')).toBe('TEST');
        expect(request.request.params.get('query-string')).toBe('192.0.2.0 - 192.0.2.255');
        expect(request.request.params.get('flags')).toBe('B');
        expect(request.request.params.getAll('type-filter')).toEqual(['inetnum']);
        request.flush({
            objects: {
                object: [
                    whoisObject,
                ],
            },
        });
    });
});
