import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ResourcesComponent } from '../../../src/app/myresources/resources.component';
import { ObjectTypesEnum } from '../../../src/app/query/object-types.enum';
import { UserInfoService } from '../../../src/app/userinfo/user-info.service';

describe('ResourcesComponent', () => {
    let component: ResourcesComponent;
    let fixture: ComponentFixture<ResourcesComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule, ResourcesComponent],
            providers: [
                {
                    provide: UserInfoService,
                    useValue: { getSelectedOrganisation: () => of({ orgObjectId: 'ORG-ANRR', organisationName: 'ORG-ANRR', roles: ['viewer'] }) },
                },
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        fixture = TestBed.createComponent(ResourcesComponent);
        component = fixture.componentInstance;
    });

    it('defaults to the IPv4 registry list', () => {
        expect(component.lastTab).toBe(ObjectTypesEnum.INETNUM);
    });

    it('uses TEST for create/update navigation', () => {
        expect(component.listOfTabs).toEqual(['inetnum', 'inet6num', 'aut-num']);
    });
});
