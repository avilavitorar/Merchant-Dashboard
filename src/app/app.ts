import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, SheetRow, MustHaveRow } from './services/dashboard';
import { forkJoin } from 'rxjs';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';

export type ChartOptions = {
  series: any;
  chart: any;
  plotOptions: any;
  stroke: any;
  colors: string[];
  labels: string[];
};

interface ProcessedStatus {
  name: string;
  value: number;
  percentage: number;
  diff: string;
  color: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  @ViewChild('chart') chart!: ChartComponent;
  public chartOptions: any = null;

  // Variáveis do Marcador Principal (Status Distribution)
  public totalMerchants: number = 0;
  public processedLegend: ProcessedStatus[] = [];
  public loading: boolean = true;
  private colors = ['#00BFA5', '#FFC107', '#D7CCC8', '#A0AEC0'];

  // 🔥 VARIÁVEIS DO NOVO CARD: Total Merchant Signed
  public ptCount: number = 0;
  public regularCount: number = 0;
  public ptDodDeltaStr: string = '0';

  // 🔥 VARIÁVEIS DO MARCADOR 1: Must Have Signed Rate
  public signedPercentage: number = 0;
  public currentSigned: number = 0;
  public currentMustHaveTotal: number = 0;

  // 🔥 VARIÁVEIS DO MARCADOR 2: Must Have Signed DoD Growth
  public dodGrowth: number = 0;
  public dodGrowthStr: string = '0';

  public ptDodDelta: number = 0; // 🔥 Adicione esta linha junto com as outras variáveis

  public currentDateStr: string = '';

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.formatCurrentDate();

    // Executa as duas requisições em paralelo de forma limpa e sênior
    forkJoin({
      statusData: this.dashboardService.getDashboardData(),
      mustHaveData: this.dashboardService.getMustHaveData()
    }).subscribe({
      next: (response) => {
        // Processa o gráfico principal de fatias e o novo card de totais do PT
        this.processStatusData(response.statusData);

        // Processa os dados dos novos marcadores da aba MustHave
        this.processMustHaveData(response.mustHaveData);

        // Desliga o carregamento e força a sincronização da UI
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro crítico ao consolidar dados do Dashboard:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private processStatusData(rows: SheetRow[]): void {
    if (!rows || rows.length === 0) return;

    // Converte os dados mapeando a nova coluna PT e ordena decrescente por data
    const sortedData = rows.map(row => ({
      Cooperating: Number(row.Cooperating || 0),
      Closed: Number(row.Closed || 0),
      Entering: Number(row.Entering || 0),
      PreOpening: Number(row.PreOpening || 0),
      Total: Number(row.Total || 0),
      PT: Number((row as any).PT || 0), // Cast temporário caso o tipo SheetRow ainda não tenha a propriedade PT
      parsedDate: this.parseDate(row.Data)
    })).sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

    const current = sortedData[0];
    const previous = sortedData[1] || current;

    // Regras de Negócio do novo card (Total Merchant Signed)
    this.totalMerchants = current.Total;
    this.ptCount = current.PT;

    // Regra: Regular = Total - PT
    this.regularCount = this.totalMerchants - this.ptCount;

    // Regra: Cálculo DoD do PT (Diferença para o último dia)
    const ptDodDelta = current.PT - previous.PT;
    this.ptDodDelta = ptDodDelta;
    this.ptDodDeltaStr = ptDodDelta > 0 ? `+${ptDodDelta}` : `${ptDodDelta}`;

    // Diferenciais para a legenda customizada inferior
    const diffCooperating = current.Cooperating - previous.Cooperating;
    const diffClosed = current.Closed - previous.Closed;
    const diffEntering = current.Entering - previous.Entering;
    const diffPreOpening = current.PreOpening - previous.PreOpening;

    const statuses = [
      { name: 'Cooperating', cur: current.Cooperating, diff: diffCooperating, color: this.colors[0] },
      { name: 'Closed', cur: current.Closed, diff: diffClosed, color: this.colors[1] },
      { name: 'Entering', cur: current.Entering, diff: diffEntering, color: this.colors[2] },
      { name: 'Preopening', cur: current.PreOpening, diff: diffPreOpening, color: this.colors[3] }
    ];

    this.processedLegend = statuses.map(status => {
      const pct = this.totalMerchants > 0 ? Math.round((status.cur / this.totalMerchants) * 100) : 0;
      let diffStr = status.diff > 0 ? `[+${status.diff}]` : status.diff < 0 ? `[${status.diff}]` : `[0]`;

      return {
        name: status.name,
        value: status.cur,
        percentage: pct,
        diff: diffStr,
        color: status.color
      };
    });

    setTimeout(() => {
      this.initChart([current.Cooperating, current.Closed, current.Entering, current.PreOpening]);
      this.cdr.detectChanges();
    }, 50);
  }

  private processMustHaveData(rows: MustHaveRow[]): void {
    if (!rows || rows.length === 0) return;

    const sortedMustHave = rows.map(row => ({
      Signed: Number(row.Signed || 0),
      MustHaveTotal: Number(row.MustHaveTotal || 0),
      parsedDate: this.parseDate(row.Data)
    })).sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

    const current = sortedMustHave[0];
    const previous = sortedMustHave[1] || current;

    this.currentSigned = current.Signed;
    this.currentMustHaveTotal = current.MustHaveTotal;

    if (this.currentMustHaveTotal > 0) {
      this.signedPercentage = Math.round((this.currentSigned / this.currentMustHaveTotal) * 1000) / 10;
    } else {
      this.signedPercentage = 0;
    }

    this.dodGrowth = current.Signed - previous.Signed;
    this.dodGrowthStr = this.dodGrowth > 0 ? `+${this.dodGrowth}` : `${this.dodGrowth}`;
  }

  private parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const str = dateStr.toString().trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    return new Date(str);
  }

  private initChart(seriesData: number[]): void {
    const statusNames = ['Cooperating', 'Closed', 'Entering', 'Pre-opening'];
    this.chartOptions = {
      series: [...seriesData],
      chart: {
        type: 'donut',
        height: 320,  // Altura fixa em pixels para estabilizar o renderizador do ApexCharts à esquerda
        width: '100%',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        }
      },
      colors: this.colors,
      labels: statusNames,
      stroke: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: '75%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                color: '#8A94A6',
                formatter: () => String(this.totalMerchants)
              }
            }
          },
          customScale: 1.0
        }
      },
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: {
        enabled: true,
        custom: ({ series, seriesIndex }: any) => {
          return `
            <div style="background: #151D30; color: #fff; padding: 10px; border: 1px solid #263554; border-radius: 4px; font-family: Arial, sans-serif;">
              <span style="font-weight: bold;">${statusNames[seriesIndex]}:</span> ${series[seriesIndex]}
            </div>
          `;
        }
      }
    };
  }

  formatCurrentDate() {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const formatted = new Date().toLocaleDateString('en-US', options);
    this.currentDateStr = `As of ${formatted}`;
  }
}
