import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HierarchySelectorService } from '../../../src/app/myresources/hierarchyselector/hierarchy-selector.service';

describe('HierarchySelectorService', () => {
    let service: HierarchySelectorService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [HierarchySelectorService, provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        httpMock = TestBed.inject(HttpTestingController);
        service = TestBed.inject(HierarchySelectorService);
    });

    afterEach(() => httpMock.verify());

    it('derives the hierarchy from authoritative TEST Whois less-specific search', () => {
        service.fetchParentResources({ resource: '192.0.2.0 - 192.0.2.255', type: 'inetnum' }, 'ORG-ANRR').subscribe((parents) => {
            expect(parents).toEqual(['192.0.0.0 - 192.0.255.255', '192.0.2.0 - 192.0.2.127']);
        });

        const request = httpMock.expectOne((candidate) => candidate.url === 'api/whois/search');
        expect(request.request.params.get('source')).toBe('TEST');
        expect(request.request.params.get('flags')).toBe('rL');
        expect(request.request.params.getAll('type-filter')).toEqual(['inetnum']);
        request.flush({
            objects: {
                object: [
                    {
                        type: 'inetnum',
                        'primary-key': { attribute: [{ name: 'inetnum', value: '10.0.0.0 - 10.255.255.255' }] },
                        attributes: { attribute: [{ name: 'org', value: 'ORG-OTHER' }] },
                    },
                    {
                        type: 'inetnum',
                        'primary-key': { attribute: [{ name: 'inetnum', value: '192.0.0.0 - 192.0.255.255' }] },
                        attributes: { attribute: [{ name: 'org', value: 'ORG-ANRR' }] },
                    },
                    {
                        type: 'inetnum',
                        'primary-key': { attribute: [{ name: 'inetnum', value: '192.0.2.0 - 192.0.2.127' }] },
                        attributes: { attribute: [{ name: 'org', value: 'ORG-ANRR' }] },
                    },
                    {
                        type: 'inetnum',
                        'primary-key': { attribute: [{ name: 'inetnum', value: '192.0.2.0 - 192.0.2.255' }] },
                        attributes: { attribute: [{ name: 'org', value: 'ORG-ANRR' }] },
                    },
                ],
            },
        });
    });
});
