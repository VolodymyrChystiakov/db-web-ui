import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnrrWhoisSearchService } from '../anrr-whois-search.service';

export interface IMoreSpecificsApiResult {
    resources: IMoreSpecificResource[];
    totalNumberOfResources: number;
    filteredSize: number;
}

export interface IMoreSpecificResource {
    netname?: string;
    asname?: string;
    resource: string;
    status?: string;
    type: string;
}

@Injectable({ providedIn: 'root' })
export class MoreSpecificsService {
    private whoisSearchService = inject(AnrrWhoisSearchService);

    public getSpecifics(objectName: string, objectType: string, page: number, filter: string): Observable<IMoreSpecificsApiResult> {
        if (!objectType) {
            return throwError(() => 'objectType is empty. more-specifics not available');
        }
        if (!objectName) {
            return throwError(() => 'objectName is empty. more-specifics not available');
        }
        filter = filter ? filter.replace(/\s/g, '') : '';
        if (objectType !== 'inetnum' && objectType !== 'inet6num') {
            return of({ resources: [], totalNumberOfResources: 0, filteredSize: 0 });
        }

        const pageSize = 100;
        return this.whoisSearchService.search(objectName, [objectType], 'M').pipe(
            map((response) => {
                const allResources = (response.objects?.object ?? []).map((object) => this.toResource(object));
                const filteredResources = filter
                    ? allResources.filter((resource) => `${resource.resource}${resource.netname ?? ''}${resource.asname ?? ''}`.toLowerCase().includes(filter.toLowerCase()))
                    : allResources;
                const start = page * pageSize;
                return {
                    resources: filteredResources.slice(start, start + pageSize),
                    totalNumberOfResources: allResources.length,
                    filteredSize: filteredResources.length,
                };
            }),
        );
    }

    private toResource(object: any): IMoreSpecificResource {
        const attributes = object.attributes?.attribute ?? [];
        const value = (name: string) => attributes.find((attribute: any) => attribute.name === name)?.value;
        return {
            resource: object['primary-key']?.attribute?.[0]?.value ?? '',
            type: object.type,
            status: value('status'),
            netname: value('netname'),
            asname: value('as-name'),
        };
    }
}
