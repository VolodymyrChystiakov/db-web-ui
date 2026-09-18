import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AssociatedObjectsComponent } from '../../../src/app/myresources/associatedobjects/associated-objects.component';

describe('AssociatedObjectsComponent', () => {
    let component: AssociatedObjectsComponent;
    let fixture: ComponentFixture<AssociatedObjectsComponent>;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule, AssociatedObjectsComponent],
            providers: [provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(AssociatedObjectsComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => httpMock.verify());

    it('renders route and route6 objects from authoritative TEST Whois', async () => {
        component.associatedType = 'route';
        component.objectType = 'aut-num';
        component.objectName = 'AS65000';
        component.ngOnChanges();
        const request = httpMock.expectOne((candidate) => candidate.url === 'api/whois/search');
        expect(request.request.params.get('source')).toBe('TEST');
        expect(request.request.params.get('inverse-attribute')).toBe('origin');
        expect(request.request.params.getAll('type-filter')).toEqual(['route', 'route6']);
        request.flush({
            objects: {
                object: [
                    {
                        type: 'route',
                        attributes: { attribute: [{ name: 'route', value: '192.0.2.0/24' }, { name: 'origin', value: 'AS65000' }] },
                    },
                ],
            },
        });
        await fixture.whenStable();
        expect(component.resultObject.associatedObjects[0].prefix).toBe('192.0.2.0/24');
        expect(component.canHaveAssociatedObjects).toBeTrue();
    });

    it('renders reverse-domain objects for an IPv4 resource', async () => {
        component.associatedType = 'domain';
        component.objectType = 'inetnum';
        component.objectName = '192.0.2.0/24';
        component.ngOnChanges();
        const request = httpMock.expectOne((candidate) => candidate.url === 'api/whois/search');
        expect(request.request.params.get('source')).toBe('TEST');
        expect(request.request.params.get('flags')).toBe('drM');
        request.flush({
            objects: {
                object: [
                    {
                        type: 'domain',
                        'primary-key': { attribute: [{ name: 'domain', value: '2.0.192.in-addr.arpa' }] },
                        attributes: { attribute: [] },
                    },
                ],
            },
        });
        await fixture.whenStable();
        expect(component.resultObject.associatedObjects[0].domain).toBe('2.0.192.in-addr.arpa');
    });
});
