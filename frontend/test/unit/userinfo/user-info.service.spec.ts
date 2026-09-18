import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CookieService } from 'ngx-cookie-service';
import { IUserInfoOrganisation, UserOrgsAndRegistrations } from '../../../src/app/dropdown/org-data-type.model';
import { UserInfoService } from '../../../src/app/userinfo/user-info.service';

describe('UserInfoService', () => {
    let userInfoService: UserInfoService;
    let cookies: CookieService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [UserInfoService, CookieService, provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        httpMock = TestBed.inject(HttpTestingController);
        userInfoService = TestBed.inject(UserInfoService);
        cookies = TestBed.inject(CookieService);
        localStorage.clear();
    });

    afterEach(() => httpMock.verify());

    it('loads account context from the browser-facing identity endpoint', () => {
        userInfoService.getUserOrgsAndRoles().subscribe((response) => expect(response).toBe(mockUserInfo));
        const request = httpMock.expectOne({ method: 'GET', url: 'api/user/info' });
        request.flush(mockUserInfo);
    });

    it('fails closed when account context is unavailable', () => {
        userInfoService.getSelectedOrganisation().subscribe({
            next: () => fail('organisation selection must not succeed'),
            error: (error) => expect(error.status).toBe(503),
        });
        const request = httpMock.expectOne({ method: 'GET', url: 'api/user/info' });
        request.flush(null, { status: 503, statusText: 'Unavailable' });
    });

    it('ignores a cookie for an organisation not mapped to the current user', () => {
        cookies.set('activeOrganisationId', 'org:ORG-OTHER', 1, '/', '.ripe.net', true);
        userInfoService.getSelectedOrganisation().subscribe((result) => expect(result.orgObjectId).toBe('ORG-ONE-ANRR'));
        const request = httpMock.expectOne({ method: 'GET', url: 'api/user/info' });
        request.flush(mockUserInfo);
    });

    it('switches only between organisations returned for the current user', () => {
        cookies.set('activeOrganisationId', 'org:ORG-TWO-ANRR', 1, '/', '.ripe.net', true);
        userInfoService.getSelectedOrganisation().subscribe((result) => expect(result.orgObjectId).toBe('ORG-TWO-ANRR'));
        const request = httpMock.expectOne({ method: 'GET', url: 'api/user/info' });
        request.flush(mockUserInfo);
    });
});

export const mockUserInfo: UserOrgsAndRegistrations = {
    user: {
        uuid: '8ffe29be-89ef-41c8-ba7f-0e1553a623e5',
        displayName: 'Test User',
        email: 'test@example.com',
        username: 'test',
    },
    organisations: [
        { orgObjectId: 'ORG-ONE-ANRR', organisationName: 'ORG-ONE-ANRR', roles: ['editor'] },
        { orgObjectId: 'ORG-TWO-ANRR', organisationName: 'ORG-TWO-ANRR', roles: ['viewer'] },
    ],
};
