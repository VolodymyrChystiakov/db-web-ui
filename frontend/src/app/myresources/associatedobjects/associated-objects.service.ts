import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnrrWhoisSearchService } from '../anrr-whois-search.service';

export interface IAssociatedObjectApiResult {
    associatedObjects: Array<IAssociatedDomainObject | IAssociatedRouteObject>;
    totalNumberOfResources: number;
    filteredSize: number;
}

export interface IAssociatedObject {
    associatedResource: string;
    associatedResourceType: string;
}

export interface IAssociatedDomainObject extends IAssociatedObject {
    domain: string;
    type: string;
}

export interface IAssociatedRouteObject extends IAssociatedObject {
    prefix: string;
    origin: string;
    type: string;
}

export enum AssociatedObjectType {
    ASSOCIATED_ROUTE = 'route',
    ASSOCIATED_DOMAIN = 'domain',
}

@Injectable({ providedIn: 'root' })
export class AssociatedObjectsService {
    private whoisSearchService = inject(AnrrWhoisSearchService);

    public getAssociatedObjects(
        associatedType: string,
        objectName: string,
        objectType: string,
        page: number,
        filter: string,
    ): Observable<IAssociatedObjectApiResult> {
        if (!objectType) {
            return throwError(() => 'objectType is empty. associated-route-objects not available');
        }
        if (!objectName) {
            return throwError(() => 'objectName is empty. associated-route-objects not available');
        }

        filter = filter ? filter.replace(/\s/g, '').toLowerCase() : '';
        if (associatedType === AssociatedObjectType.ASSOCIATED_DOMAIN && objectType === 'aut-num') {
            return of({ associatedObjects: [], totalNumberOfResources: 0, filteredSize: 0 });
        }

        const isRoute = associatedType === AssociatedObjectType.ASSOCIATED_ROUTE;
        const types = isRoute
            ? objectType === 'aut-num'
                ? ['route', 'route6']
                : [objectType === 'inet6num' ? 'route6' : 'route']
            : ['domain'];
        const flags = isRoute ? (objectType === 'aut-num' ? 'rB' : 'M') : 'drM';
        const inverseAttribute = isRoute && objectType === 'aut-num' ? 'origin' : undefined;

        return this.whoisSearchService.search(objectName, types, flags, inverseAttribute).pipe(
            map((response) => {
                const objects = response.objects?.object ?? [];
                const associatedObjects: any[] = objects.flatMap((object: any) => {
                    const attributes = object.attributes?.attribute ?? [];
                    if (isRoute) {
                        const prefix = attributes.find((attribute: any) => attribute.name === object.type)?.value ?? '';
                        const origins = attributes.filter((attribute: any) => attribute.name === 'origin').map((attribute: any) => attribute.value);
                        return (origins.length ? origins : [undefined]).map((origin: string) => ({
                            associatedResource: objectName,
                            associatedResourceType: objectType,
                            prefix,
                            origin,
                            type: object.type,
                        }));
                    }
                    return [{
                        associatedResource: objectName,
                        associatedResourceType: objectType,
                        domain: object['primary-key']?.attribute?.[0]?.value ?? '',
                        type: 'domain',
                    }];
                });
                const filtered = filter
                    ? associatedObjects.filter((object) => `${object.prefix ?? object.domain ?? ''}${object.origin ?? ''}`.toLowerCase().includes(filter))
                    : associatedObjects;
                const start = page * 100;
                return {
                    associatedObjects: filtered.slice(start, start + 100),
                    totalNumberOfResources: associatedObjects.length,
                    filteredSize: filtered.length,
                };
            }),
        );
    }
}
