import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core'; // <-- Adicionado ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { DashboardService, SheetRow } from './services/dashboard';
import { NgApexchartsModule, ChartComponent, ApexNonAxisChartSeries, ApexChart, ApexPlotOptions, ApexStroke } from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  stroke: ApexStroke;
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
  public chartOptions: any = null; // <-- Começa explicitamente como null

  public totalMerchants: number = 0;
  public processedLegend: ProcessedStatus[] = [];
  public loading: boolean = true;
  public receivedData: SheetRow[] = [];

  // Altere a quarta cor de '#FFFFFF' para '#A0AEC0' (ou '#7A869A')
private colors = ['#00BFA5', '#FFC107', '#D7CCC8', '#A0AEC0'];

  // Injetamos o cdr no construtor
  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
         this.processData(data);
      },
      error: (err) => {
        console.error('Erro ao buscar dados do SheetsDB', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private processData(rows: SheetRow[]): void {
    if (!rows || rows.length === 0) return;

    // 1. Converter strings da API para números e ordenar por data decrescente
    const sortedData = rows.map(row => ({
      Cooperating: Number(row.Cooperating),
      Closed: Number(row.Closed),
      Entering: Number(row.Entering),
      PreOpening: Number(row.PreOpening),
      Total: Number(row.Total),
      parsedDate: this.parseDate(row.Data)
    })).sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

    const current = sortedData[0];
    const previous = sortedData[1] || current;

    this.totalMerchants = current.Total;

    // 2. Calcular as diferenças
    const diffCooperating = current.Cooperating - previous.Cooperating;
    const diffClosed = current.Closed - previous.Closed;
    const diffEntering = current.Entering - previous.Entering;
    const diffPreOpening = current.PreOpening - previous.PreOpening;

    // 3. Montar a legenda customizada
    const statuses = [
      { name: 'Cooperating', cur: current.Cooperating, diff: diffCooperating, color: this.colors[0] },
      { name: 'Closed', cur: current.Closed, diff: diffClosed, color: this.colors[1] },
      { name: 'Entering', cur: current.Entering, diff: diffEntering, color: this.colors[2] },
      { name: 'Pre-Opening', cur: current.PreOpening, diff: diffPreOpening, color: this.colors[3] }
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

    // 4. O PULO DO GATO: Desligamos o loading primeiro para o Angular renderizar as divs estruturais
    this.loading = false;
    this.cdr.detectChanges(); // Força o HTML a atualizar tirando a tela de loading

    // 5. Envelopamos a criação do gráfico numa macro-task para garantir a existência do contêiner físico no DOM
    setTimeout(() => {
      this.initChart([current.Cooperating, current.Closed, current.Entering, current.PreOpening]);
      this.cdr.detectChanges(); // Notifica o ApexCharts recém-criado
    }, 50);
  }

  // Mantenha os seus métodos parseDate e initChart idênticos ao passo anterior...

  // Auxiliar para converter formato de data do Sheets (ex: "18/06/2026" ou "2026-06-18")
  private parseDate(dateStr: string): Date {
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    return new Date(dateStr);
  }

 private initChart(seriesData: number[]): void {
  // Criamos o array de nomes para reuso
  const statusNames = ['Cooperating', 'Closed', 'Entering', 'Pre-opening'];

  this.chartOptions = {
    series: [...seriesData],
    chart: {
      type: 'donut',
      height: 280
    },
    colors: this.colors,

    // Rótulos oficiais do gráfico
    labels: statusNames,

    stroke: {
      show: false
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: {
              show: false
            },
            value: {
              show: true,
              fontSize: '36px',
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontWeight: 'bold',
              color: '#FFFFFF',
              offsetY: 10,
              formatter: () => {
                return this.totalMerchants.toString();
              }
            },
            total: {
              show: true,
              label: 'Total',
              color: '#8A94A6'
            }
          }
        }
      }
    },
    legend: {
      show: false
    },
    dataLabels: {
      enabled: false
    },

    // 🔥 Customização e Blindagem do Tooltip
    tooltip: {
      enabled: true,
      custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
        // Buscamos o nome correto baseado no índice da fatia que o mouse está em cima
        const name = statusNames[seriesIndex];
        const value = series[seriesIndex];

        // Retorna a caixinha do Tooltip estilizada em HTML com o fundo Dark combinado
        return `
          <div style="background: #151D30; color: #fff; padding: 10px; border: 1px solid #263554; border-radius: 4px; font-family: Helvetica, Arial, sans-serif;">
            <span style="font-weight: bold;">${name}:</span> ${value}
          </div>
        `;
      }
    }
  };
}
}
