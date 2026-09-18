import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MoreSpecificsService } from '../../../src/app/myresources/morespecifics/more-specifics.service';

describe('MoreSpecificsService', () => {
    let service: MoreSpecificsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [MoreSpecificsService, provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        httpMock = TestBed.inject(HttpTestingController);
        service = TestBed.inject(MoreSpecificsService);
    });

    afterEach(() => httpMock.verify());

    it('rejects incomplete requests', (done) => {
        service.getSpecifics('', '', 0, '').subscribe({
            error: (error) => {
                expect(error).toBe('objectType is empty. more-specifics not available');
                done();
            },
        });
    });

    it('retrieves all more-specifics from authoritative TEST Whois and filters locally', () => {
        service.getSpecifics('192.0.2.0 - 192.0.2.255', 'inetnum', 0, 'CHILD').subscribe((result) => {
            expect(result.totalNumberOfResources).toBe(2);
            expect(result.filteredSize).toBe(1);
            expect(result.resources[0].resource).toBe('192.0.2.0 - 192.0.2.127');
        });

        const request = httpMock.expectOne((candidate) => candidate.url === 'api/whois/search');
        expect(request.request.params.get('source')).toBe('TEST');
        expect(request.request.params.get('flags')).toBe('M');
        expect(request.request.params.getAll('type-filter')).toEqual(['inetnum']);
        request.flush({
            objects: {
                object: [
                    {
                        type: 'inetnum',
                        'primary-key': { attribute: [{ name: 'inetnum', value: '192.0.2.0 - 192.0.2.127' }] },
                        attributes: { attribute: [{ name: 'netname', value: 'CHILD-V4' }, { name: 'status', value: 'ASSIGNED PA' }] },
                    },
                    {
                        type: 'inetnum',
                        'primary-key': { attribute: [{ name: 'inetnum', value: '192.0.2.128 - 192.0.2.255' }] },
                        attributes: { attribute: [{ name: 'netname', value: 'OTHER-V4' }, { name: 'status', value: 'ASSIGNED PA' }] },
                    },
                ],
            },
        });
    });
});
