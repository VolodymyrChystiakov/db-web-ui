import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AnrrWhoisSearchService } from '../anrr-whois-search.service';
import { IResourceModel } from '../resource-type.model';

@Injectable({ providedIn: 'root' })
export class HierarchySelectorService {
    private whoisSearchService = inject(AnrrWhoisSearchService);

    private cachedHierarchy: string[];

    public fetchParentResources(resource: IResourceModel, org: string): Observable<string[]> {
        if (!resource || !resource.resource || !resource.type) {
            console.error('Not a resource', resource);
            throw new TypeError('ResourcesDataService.fetchParentResource failed: not a resource');
        }
        if (this.cachedHierarchy && this.cachedHierarchy.includes(resource.resource)) {
            return of(this.cachedHierarchy.slice(0, this.cachedHierarchy.indexOf(resource.resource)));
        }
        return this.whoisSearchService.search(resource.resource, [resource.type], 'rL').pipe(
            map((response) => {
                const objects = response.objects?.object ?? [];
                const organisationIndex = objects.findIndex((object: any) =>
                    (object.attributes?.attribute ?? []).some((attribute: any) => attribute.name === 'org' && attribute.value === org),
                );
                if (organisationIndex < 0) {
                    return [];
                }
                const hierarchy = objects
                    .slice(organisationIndex)
                    .map((object: any) => object['primary-key']?.attribute?.[0]?.value)
                    .filter((key: string) => !!key && key !== resource.resource);
                this.cachedHierarchy = [...hierarchy, resource.resource];
                return hierarchy;
            }),
            tap({
                next: (result: string[]) => (this.cachedHierarchy = [...result, resource.resource]),
                error: (error: any) => console.error('hierarchy parents-of error:' + JSON.stringify(error)),
            }),
        );
    }

    public getParent(child: string): string {
        return this.cachedHierarchy?.[this.cachedHierarchy.indexOf(child) - 1];
    }
}
