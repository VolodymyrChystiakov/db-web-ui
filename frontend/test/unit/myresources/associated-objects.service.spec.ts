import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AssociatedObjectsService } from '../../../src/app/myresources/associatedobjects/associated-objects.service';

describe('AssociatedObjectsService', () => {
    let service: AssociatedObjectsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [AssociatedObjectsService, provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        httpMock = TestBed.inject(HttpTestingController);
        service = TestBed.inject(AssociatedObjectsService);
    });

    afterEach(() => httpMock.verify());

    it('finds associated route and route6 objects by aut-num origin', () => {
        service.getAssociatedObjects('route', 'AS65000', 'aut-num', 0, '').subscribe((result) => {
            expect(result.totalNumberOfResources).toBe(2);
            expect(result.associatedObjects.map((object: any) => object.origin)).toEqual(['AS65000', 'AS65000']);
        });

        const request = httpMock.expectOne((candidate) => candidate.url === 'api/whois/search');
        expect(request.request.params.get('source')).toBe('TEST');
        expect(request.request.params.get('flags')).toBe('rB');
        expect(request.request.params.get('inverse-attribute')).toBe('origin');
        expect(request.request.params.getAll('type-filter')).toEqual(['route', 'route6']);
        request.flush({
            objects: {
                object: [
                    {
                        type: 'route',
                        'primary-key': { attribute: [{ name: 'route', value: '192.0.2.0/24' }, { name: 'origin', value: 'AS65000' }] },
                        attributes: {
                            attribute: [{ name: 'route', value: '192.0.2.0/24' }, { name: 'origin', value: 'AS65000' }],
                        },
                    },
                    {
                        type: 'route6',
                        'primary-key': { attribute: [{ name: 'route6', value: '2001:db8::/32' }, { name: 'origin', value: 'AS65000' }] },
                        attributes: {
                            attribute: [{ name: 'route6', value: '2001:db8::/32' }, { name: 'origin', value: 'AS65000' }],
                        },
                    },
                ],
            },
        });
    });

    it('finds associated reverse-domain objects for an IPv6 resource', () => {
        service.getAssociatedObjects('domain', '2001:db8::/48', 'inet6num', 0, '').subscribe((result) => {
            expect(result.associatedObjects[0].domain).toBe('8.b.d.0.1.0.0.2.ip6.arpa');
        });

        const request = httpMock.expectOne((candidate) => candidate.url === 'api/whois/search');
        expect(request.request.params.get('source')).toBe('TEST');
        expect(request.request.params.get('flags')).toBe('drM');
        expect(request.request.params.getAll('type-filter')).toEqual(['domain']);
        request.flush({
            objects: {
                object: [
                    {
                        type: 'domain',
                        'primary-key': { attribute: [{ name: 'domain', value: '8.b.d.0.1.0.0.2.ip6.arpa' }] },
                        attributes: { attribute: [] },
                    },
                ],
            },
        });
    });

    it('does not make a public query for unsupported aut-num domain associations', () => {
        service.getAssociatedObjects('domain', 'AS65000', 'aut-num', 0, '').subscribe((result) => {
            expect(result.associatedObjects).toEqual([]);
        });
    });
});
