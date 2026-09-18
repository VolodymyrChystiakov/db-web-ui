import { Location } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MoreSpecificsComponent } from '../../../src/app/myresources/morespecifics/more-specifics.component';

describe('MoreSpecificsComponent', () => {
    let component: MoreSpecificsComponent;
    let fixture: ComponentFixture<MoreSpecificsComponent>;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule, MoreSpecificsComponent],
            providers: [
                { provide: Location, useValue: { path: () => '/myresources/detail' } },
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(MoreSpecificsComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => httpMock.verify());

    it('renders more-specifics returned by the public TEST search', async () => {
        component.objectType = 'inetnum';
        component.objectName = '192.0.2.0 - 192.0.2.255';
        component.ngOnChanges();
        const request = httpMock.expectOne((candidate) => candidate.url === 'api/whois/search');
        expect(request.request.params.get('source')).toBe('TEST');
        expect(request.request.params.get('flags')).toBe('M');
        request.flush({
            objects: {
                object: [
                    {
                        type: 'inetnum',
                        'primary-key': { attribute: [{ name: 'inetnum', value: '192.0.2.0 - 192.0.2.127' }] },
                        attributes: { attribute: [{ name: 'status', value: 'ASSIGNED PA' }, { name: 'netname', value: 'CHILD-V4' }] },
                    },
                ],
            },
        });
        await fixture.whenStable();
        expect(component.moreSpecifics.resources[0].resource).toBe('192.0.2.0 - 192.0.2.127');
    });
});
