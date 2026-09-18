import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { IWhoisObjectModel } from '../shared/whois-response-type.model';
import { IMoreSpecificsApiResult } from './morespecifics/more-specifics.service';
import { IIPv4ResourcesResponse, IIPv6ResourcesResponse, IIpv4Analysis, IResourceOverviewResponseModel, IResourceTickets } from './resource-type.model';
import { AnrrWhoisSearchService } from './anrr-whois-search.service';

@Injectable({ providedIn: 'root' })
export class ResourcesDataService {
    private http = inject(HttpClient);
    private whoisSearchService = inject(AnrrWhoisSearchService);

    public fetchResource(objectName: string, type: string): Observable<any> {
        return this.whoisSearchService.search(objectName, [type], 'B').pipe(
            map((response) => {
                const object = response.objects?.object?.find((candidate) => candidate.type?.toLowerCase() === type.toLowerCase());
                if (!object) {
                    throw new Error(`No ${type} object found for ${objectName}`);
                }
                const resource = this.toResourceSummary(object);
                return {
                    object: this.withoutBusinessAttributes(object),
                    resources: [resource],
                    totalNumberOfResources: 1,
                    filteredSize: 1,
                };
            }),
        );
    }

    public fetchIpv4Resource(objectName: string): Observable<IIPv4ResourcesResponse> {
        return this.http.get<IIPv4ResourcesResponse>(`api/whois-internal/api/resources/inetnum/${objectName}`);
    }

    public fetchIpv6Resource(objectName: string): Observable<IIPv6ResourcesResponse> {
        return this.http.get<IIPv4ResourcesResponse>(`api/whois-internal/api/resources/inet6num/${objectName}`);
    }

    public fetchResources(orgId: string, resourceType: string, _sponsored = false): Observable<IResourceOverviewResponseModel> {
        if (!resourceType) {
            console.error('fetchResources failed. No resourceType given');
            return throwError(() => new TypeError('resourceType is required'));
        }
        const params = new HttpParams().set('org-id', orgId).set('type', resourceType);
        return this.http.get<IResourceOverviewResponseModel>('api/user/resources', { params }).pipe(timeout(60000));
    }

    public fetchIpv4Analysis(orgId: string): Observable<IIpv4Analysis> {
        const params = new HttpParams().set('org-id', orgId);
        return this.http.get<IIpv4Analysis>('api/whois-internal/api/resources/ipanalyser/ipv4.json', { params }).pipe(timeout(30000));
    }

    public fetchTicketsAndDates(orgId: string, resource: string): Observable<IResourceTickets> {
        return this.http.get<IResourceTickets>(`api/ba-apps/resources/${orgId}/${resource}`).pipe(
            catchError((error) => {
                console.debug('Error on tickets retrieval', error);
                return of({
                    tickets: {
                        [resource]: [],
                    },
                });
            }),
        );
    }

    private toResourceSummary(object: IWhoisObjectModel) {
        const attributes = object.attributes?.attribute ?? [];
        const primaryKey = object['primary-key']?.attribute?.[0]?.value ?? '';
        const value = (name: string) => attributes.find((attribute) => attribute.name === name)?.value;
        return {
            resource: primaryKey,
            type: object.type,
            status: value('status'),
            netname: value('netname'),
            asname: value('as-name'),
        };
    }

    private withoutBusinessAttributes(object: IWhoisObjectModel): IWhoisObjectModel {
        return {
            ...object,
            attributes: {
                ...object.attributes,
                attribute: (object.attributes?.attribute ?? []).filter((attribute) => attribute.name !== 'sponsoring-org'),
            },
        };
    }
}
