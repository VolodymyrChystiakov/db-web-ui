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

    it('reads current object details from public TEST Whois and hides unsupported business attributes', () => {
        resourcesDataService.fetchResource('AS65000', 'aut-num').subscribe((result) => {
            expect(result.resources[0].resource).toBe('AS65000');
            expect(result.resources[0].asname).toBe('ANRR-AS');
            expect(result.object.source.id).toBe('test');
            expect(result.object.attributes.attribute.some((attribute) => attribute.name === 'sponsoring-org')).toBeFalse();
        });

        const request = httpMock.expectOne((candidate) => candidate.url === 'api/whois/search');
        expect(request.request.params.get('source')).toBe('TEST');
        expect(request.request.params.get('query-string')).toBe('AS65000');
        expect(request.request.params.get('flags')).toBe('B');
        expect(request.request.params.getAll('type-filter')).toEqual(['aut-num']);
        request.flush({
            objects: {
                object: [
                    {
                        type: 'aut-num',
                        source: { id: 'test' },
                        'primary-key': { attribute: [{ name: 'aut-num', value: 'AS65000' }] },
                        attributes: {
                            attribute: [
                                { name: 'aut-num', value: 'AS65000' },
                                { name: 'as-name', value: 'ANRR-AS' },
                                { name: 'status', value: 'ASSIGNED' },
                                { name: 'sponsoring-org', value: 'ORG-RIPE' },
                            ],
                        },
                    },
                ],
            },
        });
    });
});
