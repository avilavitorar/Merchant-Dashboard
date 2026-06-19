import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interface para a aba principal que já tínhamos
export interface SheetRow {
  Cooperating: string;
  Closed: string;
  Entering: string;
  PreOpening: string;
  Total: string;
  Data: string;
}

// 🔥 NOVA INTERFACE: Representa exatamente a aba MustHave da planilha
export interface MustHaveRow {
  Signed: string;
  MustHaveTotal: string;
  Data: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // Pegamos a URL base limpa do environment (ex: https://sheetsdb.io/api/v1/SUA_API_ID)
  private baseUrl = environment.sheetsDbUrl.split('?')[0];

  constructor(private http: HttpClient) { }

  // Mantém a busca da aba de distribuição de status
  getDashboardData(): Observable<SheetRow[]> {
    return this.http.get<SheetRow[]>(`${this.baseUrl}?sheet=StatusDistribuition`);
  }

  // 🔥 NOVO MÉTODO: Busca os dados específicos da aba MustHave
  getMustHaveData(): Observable<MustHaveRow[]> {
    return this.http.get<MustHaveRow[]>(`${this.baseUrl}?sheet=MustHave`);
  }
}
