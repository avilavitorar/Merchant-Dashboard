import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SheetRow {
  Cooperating: string | number;
  Closed: string | number;
  Entering: string | number;
  PreOpening: string | number;
  Total: string | number;
  Data: string; // Formato esperado ex: "2026-06-18" ou "18/06/2026"
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // Lendo dinamicamente a configuração segura
  private apiUrl = environment.sheetsDbUrl;

  constructor(private http: HttpClient) { }

  getDashboardData(): Observable<SheetRow[]> {
    return this.http.get<SheetRow[]>(this.apiUrl);
  }
}
