import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { IWhoisResponseModel } from '../shared/whois-response-type.model';

@Injectable({ providedIn: 'root' })
export class AnrrWhoisSearchService {
    public static readonly SOURCE = 'TEST';

    private http = inject(HttpClient);

    public search(query: string, typeFilters: string[], flags: string, inverseAttribute?: string): Observable<IWhoisResponseModel> {
        let params = new HttpParams()
            .set('source', AnrrWhoisSearchService.SOURCE)
            .set('query-string', query)
            .set('ignore404', 'true')
            .set('flags', flags);
        if (inverseAttribute) {
            params = params.set('inverse-attribute', inverseAttribute);
        }
        for (const typeFilter of typeFilters) {
            params = params.append('type-filter', typeFilter);
        }
        return this.http.get<IWhoisResponseModel>('api/whois/search', { params }).pipe(timeout(60000));
    }
}
