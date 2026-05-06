import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataService, CSVProduct, DohLevel, BtsProduct, OrderLine, BtsItemKPI, BtsStoreDetail } from '../../services/data.service';
import { NavigationService } from '../../services/navigation.service';
import { Product } from '../../models/product.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { PredictionDialogComponent } from '../dialogs/prediction-dialog/prediction-dialog.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatSort)     sort!:     MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // ── Estado general ──────────────────────────────────────────────────────
  viewMode: 'operativo' | 'table' | 'csv' | 'prediction' | 'welcome' | 'bts' = 'operativo';

  // ── Datos ───────────────────────────────────────────────────────────────
  selectedProduct:  Product | null = null;
  csvProducts:      CSVProduct[]   = [];
  isLoading:        boolean        = false;
  allProducts:      Product[]      = [];

  // ── Tabla de inventario general ─────────────────────────────────────────
  displayedColumns: string[] = ['id', 'name', 'category', 'currentStock', 'weeklyDemand', 'price', 'trend', 'actions'];
  dataSource = new MatTableDataSource<Product>();

  // ── Semáforo DOH (E01) ──────────────────────────────────────────────────
  dohColumns: string[] = ['name', 'category', 'doh', 'semaphore', 'inStockPct'];
  categoryFilter: string = 'all';
  dohCategories:  string[] = [];

  // ── KPIs (E02) ──────────────────────────────────────────────────────────
  globalInStock: number = 0;
  avgDoh:        number = 0;
  dohDistribution = { red: 0, orange: 0, yellow: 0, green: 0 };
  criticalCount:   number = 0;   // artículos en rojo

  // ── Top 10 Críticos chart (E03) ─────────────────────────────────────────
  top10ChartOptions: any;
  top10Products: Product[] = [];

  // ── Filtros tabla general ────────────────────────────────────────────────
  searchTerm:       string = '';
  selectedCategory: string = 'all';
  categories:       string[] = [];

  // ── Suscripción de navegación ────────────────────────────────────────────
  private navSub!: Subscription;

  // ── Stats CSV ────────────────────────────────────────────────────────────
  totalProducts: number = 0;
  csvStats = { total: 0, categories: [] as string[], categoryCounts: new Map<string, number>() };

  // ── BTS Operativo ─────────────────────────────────────────────────────────
  btsProducts: BtsProduct[] = [];
  btsFilters = { semaphore: 'all', cedis: 'all', abc: 'all', onlyResurtible: false, onlyRojo: false, search: '' };
  bubbleChartOptions: any;
  showOrderPanel = false;
  orderLines: OrderLine[] = [];

  // ── BTS Analytics (datos reales) ──────────────────────────────────────────
  btsRealItems: BtsItemKPI[] = [];
  btsRealKPIs = { avgIs1d: 0, avgIs7d: 0, avgDoh: 0, totalAgotados: 0, totalResurtible: 0, totalItems: 0 };
  fillRateChartOptions: any;
  dohDistChartOptions:  any;
  sales2026ChartOptions: any;
  yoyChartOptions:      any;
  isChartOptions:       any;
  desvChartOptions:     any;
  btsAnalyticsReady = false;

  // ── BTS Store Detail Panel ─────────────────────────────────────────────────
  selectedBubble: { itemNbr: number; desc: string; doh: number; agotados: number; stores: number; falta7d: number; venta8sem: number } | null = null;
  btsStoreDetail: BtsStoreDetail[] = [];
  sortedBtsStoreDetail: BtsStoreDetail[] = [];
  btsStoreDetailLoading = false;
  btsStoreDetailSort: keyof BtsStoreDetail | 'priority' = 'priority';
  btsStoreDetailDir: 'asc' | 'desc' = 'asc';

  // ── Column filters (Excel-style) ───────────────────────────────────────────
  storeFilterOpen: string | null = null;
  storeFilterPos: { top: number; left: number } = { top: 0, left: 0 };
  storeFilters: Record<string, Set<string>> = {};
  storeFilterSearch: Record<string, string> = {};

  readonly storeTableCols: { key: keyof BtsStoreDetail | 'priority'; label: string }[] = [
    { key: 'agotado',    label: 'Estado'       },
    { key: 'storeName',  label: 'Tienda'       },
    { key: 'formato',    label: 'Formato'      },
    { key: 'whseNbr',    label: 'CEDIS (WH)'   },
    { key: 'onHand',     label: 'Stock'        },
    { key: 'inTransit',  label: 'Tránsito'     },
    { key: 'inWhse',     label: 'Bodega'       },
    { key: 'onOrder',    label: 'En Orden'     },
    { key: 'promDia',    label: 'Venta/día'    },
    { key: 'doh',        label: 'DOH'          },
    { key: 'falta1d',    label: 'Falta 1D'     },
    { key: 'falta3d',    label: 'Falta 3D'     },
    { key: 'falta7d',    label: 'Falta 7D'     },
    { key: 'venta8sem',  label: 'Ventas 8 sem' },
    { key: 'resurtible', label: 'Resurtible'   },
  ];

  // ── Paginación ────────────────────────────────────────────────────────────
  pageSize    = 10;
  currentPage = 1;
  totalPages  = 1;

  constructor(
    private dataService: DataService,
    private navService:  NavigationService,
    private dialog:      MatDialog,
    private cdr:         ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupSubscriptions();
    this.initializeDefaultProduct();

    this.loadBtsData();

    // Suscribirse al NavigationService — el header controla la vista
    this.navSub = this.navService.view$.subscribe(view => {
      // Si piden CSV pero no hay productos cargados, volver a operativo
      if (view === 'csv' && this.csvProducts.length === 0) {
        this.navService.navigateTo('operativo');
        return;
      }
      this.viewMode = view;
      if (view !== 'prediction') this.selectedProduct = null;
      if (view === 'bts') {
        this.buildBubbleChart();
        if (this.dataService.getBtsWeekly2026().length) this.buildSales2026Chart();
        if (this.dataService.getBtsWeekly2026().length && this.dataService.getBtsWeekly2024().length) this.buildYoYChart();
        if (this.btsRealItems.length) {
          this.buildFillRateChart(); this.buildDohDistChart(); this.buildIsChart(); this.buildDesvChart();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort      = this.sort;
    this.dataSource.paginator = this.paginator;
    this.cdr.detectChanges();
  }

  // ── Carga de datos ────────────────────────────────────────────────────────
  private loadData(): void {
    this.allProducts = this.dataService.getAllProducts();
    this.dataSource.data = this.allProducts;
    this.totalProducts   = this.allProducts.length;
    this.updateCategories();
    this.applyTableFilters();
    this.refreshKPIs();
  }

  private refreshKPIs(): void {
    this.globalInStock    = this.dataService.getGlobalInStock();
    this.avgDoh           = this.dataService.getAvgDoh();
    this.dohDistribution  = this.dataService.getDohDistribution();
    this.criticalCount    = this.dohDistribution.red;
    this.top10Products    = this.dataService.getTop10Critical();
    this.dohCategories    = ['all', ...new Set(this.allProducts.map(p => p.category)).values()].sort();
    this.buildTop10Chart();
  }

  private setupSubscriptions(): void {
    this.dataService.csvProducts$.subscribe(products => {
      this.csvProducts = products;
      if (products.length > 0) {
        this.updateCSVStats();
      }
    });
    this.dataService.products$.subscribe(products => {
      this.allProducts     = products;
      this.dataSource.data = products;
      this.totalProducts   = products.length;
      this.updateCategories();
      this.applyTableFilters();
      this.refreshKPIs();
    });

    // Suscribir a datos reales BTS — construir gráficas cuando todos están listos
    this.dataService.btsItems$.subscribe(items => {
      if (items.length) {
        this.btsRealItems  = items;
        this.btsRealKPIs   = this.dataService.getBtsRealKPIs();
        this.buildFillRateChart();
        this.buildDohDistChart();
        this.buildIsChart();
        this.buildDesvChart();
        this.tryBuildCombinedCharts();
      }
    });
    this.dataService.btsWeekly2026$.subscribe(data => {
      if (data.length) this.tryBuildCombinedCharts();
    });
    this.dataService.btsWeekly2024$.subscribe(data => {
      if (data.length) this.tryBuildCombinedCharts();
    });
  }

  private tryBuildCombinedCharts(): void {
    const has2026 = this.dataService.getBtsWeekly2026().length > 0;
    const has2024 = this.dataService.getBtsWeekly2024().length > 0;
    if (has2026) {
      this.buildSales2026Chart();
      this.buildBubbleChart();  // reconstruir burbuja con datos reales
    }
    if (has2026 && has2024) this.buildYoYChart();
    if (has2026 || this.btsRealItems.length) {
      this.btsAnalyticsReady = true;
      this.cdr.detectChanges();
    }
  }

  private initializeDefaultProduct(): void {
    if (this.allProducts.length > 0) {
      this.selectedProduct = this.allProducts[0];
    }
  }

  // ── Semáforo DOH (E01) ────────────────────────────────────────────────────
  get filteredDohProducts(): Product[] {
    if (this.categoryFilter === 'all') return this.allProducts;
    return this.allProducts.filter(p => p.category === this.categoryFilter);
  }

  getDohChipClass(doh: number): string {
    const level = this.dataService.getDohSemaphore(doh);
    return `chip-${level}`;
  }

  getDohRowClass(doh: number): string {
    const level = this.dataService.getDohSemaphore(doh);
    return `row-${level}`;
  }

  getDohLabel(doh: number): string {
    const level = this.dataService.getDohSemaphore(doh);
    const labels: Record<DohLevel, string> = { red: 'ROJO', orange: 'NARANJA', yellow: 'AMARILLO', green: 'VERDE' };
    return labels[level];
  }

  getInStockChipClass(pct: number): string {
    const level = this.dataService.getInStockSemaphore(pct);
    return `chip-${level}`;
  }

  get inStockSemaphoreClass(): string {
    return `chip-${this.dataService.getInStockSemaphore(this.globalInStock)}`;
  }

  // ── Top 10 Críticos chart (E03) ───────────────────────────────────────────
  private buildTop10Chart(): void {
    const top10 = this.top10Products;
    const names  = top10.map(p => p.name.length > 28 ? p.name.substring(0, 26) + '…' : p.name);
    const values = top10.map(p => p.doh);
    const colors = top10.map(p => {
      const l = this.dataService.getDohSemaphore(p.doh);
      return l === 'red' ? '#FC8181' : l === 'orange' ? '#F6AD55' : '#F6E05E';
    });

    this.top10ChartOptions = {
      series: [{ name: 'DOH (días)', data: values }],
      chart:  { type: 'bar', height: 320, toolbar: { show: false }, animations: { enabled: false } },
      plotOptions: {
        bar: {
          horizontal:       true,
          distributed:      true,
          borderRadius:     4,
          dataLabels:       { position: 'center' }
        }
      },
      colors,
      dataLabels: {
        enabled:   true,
        formatter: (val: number) => `${val} días`,
        style:     { fontSize: '12px', colors: ['#2d3748'] }
      },
      xaxis: {
        categories: names,
        min: 0,
        max: 75,
        title:  { text: 'Días de Inventario (DOH)' },
        labels: { style: { fontSize: '11px' } }
      },
      yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 160 } },
      legend: { show: false },
      tooltip: {
        y: {
          formatter: (val: number, opts: any) => {
            const p = top10[opts.dataPointIndex];
            return `${val} días | InStock: ${p?.inStockPct}%`;
          }
        }
      },
      annotations: {
        xaxis: [{
          x:            70,
          borderColor:  '#38A169',
          strokeDashArray: 4,
          label: {
            text:  'Objetivo WM 70d',
            style: { color: '#276749', fontSize: '11px', background: '#C6F6D5' }
          }
        }]
      },
      grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } }
    };
  }

  // ── Navegación de vistas ──────────────────────────────────────────────────
  onFileUploaded(): void { this.navService.navigateTo('csv'); }

  onPredict(): void {
    if (this.selectedProduct) {
      this.isLoading = true;
      this.navService.navigateTo('prediction');
      setTimeout(() => { this.isLoading = false; }, 800);
    }
  }

  switchToOperativoView(): void { this.navService.navigateTo('operativo'); }
  switchToTableView():     void { this.clearTableFilters(); this.navService.navigateTo('table'); }
  switchToCSVView():       void { if (this.csvProducts.length > 0) this.navService.navigateTo('csv'); }

  // ── Tabla de inventario ───────────────────────────────────────────────────
  applyTableFilters(): void {
    let filtered = this.allProducts;
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(t) || p.id.toLowerCase().includes(t) || p.category.toLowerCase().includes(t)
      );
    }
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === this.selectedCategory);
    }
    this.dataSource.data = filtered;
    this.totalProducts   = filtered.length;
    this.updatePagination();
  }

  clearTableFilters(): void { this.searchTerm = ''; this.selectedCategory = 'all'; this.applyTableFilters(); }

  updateCategories(): void {
    this.categories = [...new Set(this.allProducts.map(p => p.category))].sort();
  }

  selectProduct(product: Product): void {
    this.selectedProduct = product;
    this.navService.navigateTo('prediction');
  }

  // ── CSV ───────────────────────────────────────────────────────────────────
  updateCSVStats(): void {
    const categories    = new Set<string>();
    const categoryCounts = new Map<string, number>();
    this.csvProducts.forEach(p => {
      const cat = p.category || 'Sin categoría';
      categories.add(cat);
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    });
    this.csvStats = { total: this.csvProducts.length, categories: Array.from(categories).sort(), categoryCounts };
  }

  generatePredictions(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
      alert(`Análisis predictivo completado para ${this.csvProducts.length} productos`);
    }, 2000);
  }

  exportAnalysis(): void {
    const data = { products: this.csvProducts, generatedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `analisis-kmco-${Date.now()}.json`; a.click();
    window.URL.revokeObjectURL(url);
  }

  onAnalyze(): void {
    if (this.selectedProduct) {
      this.isLoading = true;
      setTimeout(() => { this.isLoading = false; this.openPredictionDialog(); }, 1200);
    }
  }

  openPredictionDialog(): void {
    this.dialog.open(PredictionDialogComponent, {
      width: '800px',
      data: { product: this.selectedProduct, predictions: this.generateDetailedPredictions() }
    });
  }

  analyzeTrends(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
      this.dialog.open(PredictionDialogComponent, {
        width: '900px',
        data: { title: 'Análisis de Tendencias', type: 'trends', trends: this.generateTrendAnalysis() }
      });
    }, 1200);
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  getChangeColor(percent: number): string {
    return percent >= 40 ? '#e53e3e' : percent >= 25 ? '#d69e2e' : percent >= 10 ? '#38a169' : '#718096';
  }

  getTrendIcon(trend: number):  string { return trend > 10 ? 'trending_up' : trend < -10 ? 'trending_down' : 'trending_flat'; }
  getTrendColor(trend: number): string { return trend > 10 ? '#e53e3e' : trend < -10 ? '#38a169' : '#718096'; }

  // ── Paginación ────────────────────────────────────────────────────────────
  get paginatedProducts(): Product[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.dataSource.data.slice(start, start + this.pageSize);
  }

  get totalFilteredProducts(): number { return this.dataSource.data.length; }

  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }

  goToPage(page: number): void { if (page >= 1 && page <= this.totalPages) this.currentPage = page; }

  getPageNumbers(): number[] {
    const max = 5;
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    let end   = Math.min(start + max - 1, this.totalPages);
    start     = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  updatePagination(): void {
    this.totalPages  = Math.ceil(this.totalFilteredProducts / this.pageSize);
    if (this.currentPage > this.totalPages) this.currentPage = 1;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).catch(err => console.error('Error al copiar:', err));
  }

  get currentDate(): Date { return new Date(); }

  resetApplication(): void {
    this.selectedProduct = null; this.csvProducts = [];
    this.searchTerm = ''; this.selectedCategory = 'all'; this.currentPage = 1;
    this.isLoading = false; this.loadData();
    this.navService.navigateTo('operativo');
  }

  // ── BTS Operativo ─────────────────────────────────────────────────────────
  private loadBtsData(): void {
    this.btsProducts = this.dataService.getBtsProducts();
    this.buildBubbleChart();
  }

  get filteredBtsProducts(): BtsProduct[] {
    let list = this.btsProducts;
    const f = this.btsFilters;
    if (f.onlyRojo)       list = list.filter(p => this.dataService.getDohSemaphore(p.doh) === 'red');
    if (f.onlyResurtible) list = list.filter(p => p.isResurtible);
    if (f.semaphore !== 'all') list = list.filter(p => this.dataService.getDohSemaphore(p.doh) === f.semaphore);
    if (f.cedis !== 'all')     list = list.filter(p => p.cedis === f.cedis);
    if (f.abc !== 'all')       list = list.filter(p => p.abc === f.abc);
    if (f.search) {
      const s = f.search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s));
    }
    return list;
  }

  get btsKPIs() {
    const list = this.btsProducts;
    const atRisk = list.filter(p => this.dataService.getDohSemaphore(p.doh) === 'red' || this.dataService.getDohSemaphore(p.doh) === 'orange').length;
    const storesStockout = list.reduce((acc, p) => acc + p.storesStockout, 0);
    const resurtibles = list.filter(p => p.isResurtible).length;
    const resurtiblePct = list.length ? Math.round(resurtibles / list.length * 100) : 0;
    const avgDev = list.length ? Math.round(list.reduce((a, p) => a + p.forecastDeviation, 0) / list.length) : 0;
    return { atRisk, storesStockout, resurtiblePct, avgDev, resurtibles };
  }

  get btsCedisList(): string[] {
    return [...new Set(this.btsProducts.map(p => p.cedis))].sort();
  }

  buildBubbleChart(): void {
    const levels: Array<{ key: string; label: string; color: string }> = [
      { key: 'red',    label: 'ROJO',     color: '#FC8181' },
      { key: 'orange', label: 'NARANJA',  color: '#F6AD55' },
      { key: 'yellow', label: 'AMARILLO', color: '#F6E05E' },
      { key: 'green',  label: 'VERDE',    color: '#68D391' },
    ];

    const realItems = this.dataService.getBtsWeekly2026();

    // Si ya llegaron los datos reales, los usamos; si no, fallback a mock
    if (realItems.length > 0) {
      const weeks2026 = ['202604','202605','202606','202607','202608','202609','202610','202612'];

      // Solo artículos con urgencia real: DOH ≤ 70 O faltante en 7 días > 0
      const urgent = realItems.filter(p =>
        (p.dohAvg > 0 && p.dohAvg <= 70) || p.falta7d > 0
      );

      // Calcular medianas para líneas de cuadrante
      const allVentas  = urgent.map(p => weeks2026.reduce((s, w) => s + (p.pos2026[w] || 0), 0));
      const allAgotadas = urgent.map(p => p.agotados);
      const sortedV = [...allVentas].sort((a, b) => a - b);
      const sortedA = [...allAgotadas].sort((a, b) => a - b);
      const medVentas   = sortedV[Math.floor(sortedV.length / 2)] || 0;
      const medAgotadas = sortedA[Math.floor(sortedA.length / 2)] || 0;

      const series = levels.map(lvl => ({
        name: lvl.label,
        data: urgent
          .filter(p => this.dataService.getDohSemaphore(p.dohAvg) === lvl.key)
          .map(p => {
            const ventaSem = weeks2026.reduce((s, w) => s + (p.pos2026[w] || 0), 0);
            return {
              x: ventaSem,
              y: p.agotados,
              z: Math.max(p.falta7d, 1),
              name: p.desc,
              itemNbr: p.itemNbr,
              doh: p.dohAvg,
              stores: p.storeCount,
              agotados: p.agotados,
              falta7d: p.falta7d,
              ventaSem
            };
          })
      })).filter(s => s.data.length > 0);

      this.bubbleChartOptions = {
        series,
        chart:  { type: 'bubble', height: 500, toolbar: { show: false }, animations: { enabled: false },
          events: {
            dataPointSelection: (_e: any, _ctx: any, config: any) => {
              const pt = this.bubbleChartOptions.series[config.seriesIndex]?.data[config.dataPointIndex] as any;
              if (pt) this.onBubbleClick(pt);
            }
          }
        },
        colors: levels.filter(l => urgent.some(p => this.dataService.getDohSemaphore(p.dohAvg) === l.key)).map(l => l.color),
        dataLabels: { enabled: false },
        xaxis:  {
          type: 'numeric', tickAmount: 8,
          title: { text: 'Ventas acumuladas 8 semanas (uds)' },
          labels: { formatter: (v: string) => { const n = Number(v); return n >= 1000 ? (n/1000).toFixed(0)+'k' : n.toFixed(0); } }
        },
        yaxis:  {
          title: { text: 'Tiendas agotadas (conteo)' }, min: 0, tickAmount: 6,
          labels: { formatter: (v: number) => v.toFixed(0) }
        },
        legend: { position: 'top' },
        annotations: {
          xaxis: [{
            x: medVentas,
            borderColor: '#718096',
            strokeDashArray: 5,
            label: { text: 'Vol. medio', style: { color: '#fff', background: '#718096', fontSize: '10px' } }
          }],
          yaxis: [{
            y: medAgotadas,
            borderColor: '#718096',
            strokeDashArray: 5,
            label: { text: 'Agotadas medio', style: { color: '#fff', background: '#718096', fontSize: '10px' }, position: 'left' }
          }]
        },
        tooltip: {
          custom: ({ seriesIndex, dataPointIndex, w }: any) => {
            const d = w.config.series[seriesIndex].data[dataPointIndex] as any;
            const pct = d.stores > 0 ? (d.agotados / d.stores * 100).toFixed(1) : '0';
            return `<div class="bts-tooltip">
              <b>${d.name}</b><br>
              🔴 DOH: ${d.doh.toFixed(1)}d<br>
              📦 Ventas 8 sem: ${d.ventaSem.toLocaleString()} uds<br>
              🏪 Tiendas agotadas: ${d.agotados} / ${d.stores} (${pct}%)<br>
              ⚠️ Faltante 7D: ${d.falta7d.toLocaleString()} uds
            </div>`;
          }
        },
        grid: { padding: { right: 20 } }
      };
    } else {
      // fallback mock
      const series = levels.map(lvl => ({
        name: lvl.label,
        data: this.btsProducts
          .filter(p => this.dataService.getDohSemaphore(p.doh) === lvl.key)
          .map(p => ({ x: Math.round(p.dailySales * 10) / 10, y: Math.round(p.dohPipeline), z: p.storesStockout + 1, name: p.name }))
      })).filter(s => s.data.length > 0);

      this.bubbleChartOptions = {
        series,
        chart:  { type: 'bubble', height: 400, toolbar: { show: false }, animations: { enabled: false } },
        colors: levels.filter(l => this.btsProducts.some(p => this.dataService.getDohSemaphore(p.doh) === l.key)).map(l => l.color),
        dataLabels: { enabled: false },
        xaxis:  { title: { text: 'Velocidad de venta (uds/día)' }, min: 0 },
        yaxis:  { title: { text: 'DOH Tubería (días)' }, min: 0 },
        legend: { position: 'top' },
        tooltip: {
          custom: ({ seriesIndex, dataPointIndex, w }: any) => {
            const d = w.config.series[seriesIndex].data[dataPointIndex];
            return `<div class="bts-tooltip"><b>${d.name}</b><br>Velocidad: ${d.x} u/d<br>DOH Tubería: ${d.y}d<br>Tiendas sin stock: ${d.z - 1}</div>`;
          }
        },
        grid: { padding: { right: 20 } }
      };
    }
  }

  generateOrder(): void {
    this.orderLines = this.dataService.getOrderConsolidated(this.filteredBtsProducts);
    this.showOrderPanel = true;
  }

  getBtsDohClass(doh: number): string { return `chip-${this.dataService.getDohSemaphore(doh)}`; }
  getBtsDohLabel(doh: number): string {
    const labels: Record<DohLevel, string> = { red: 'ROJO', orange: 'NARANJA', yellow: 'AMARILLO', green: 'VERDE' };
    return labels[this.dataService.getDohSemaphore(doh)];
  }

  // ── BTS Analytics Charts ──────────────────────────────────────────────────

  buildSales2026Chart(): void {
    const d = this.dataService.getBtsSales2026VsFcst();
    this.sales2026ChartOptions = {
      series: [
        { name: 'Venta Real', type: 'bar',  data: d.posActual },
        { name: 'Forecast',   type: 'line', data: d.forecast  },
      ],
      chart: { type: 'line', height: 420, toolbar: { show: false }, animations: { enabled: false } },
      stroke: { width: [0, 3], curve: 'smooth' },
      fill:   { opacity: [0.85, 1] },
      colors: ['#4299E1','#FC8181'],
      dataLabels: { enabled: false },
      xaxis: { categories: d.weeks, title: { text: 'Semana 2026' } },
      yaxis: { title: { text: 'Unidades' } },
      legend: { position: 'top' },
      tooltip: { shared: true, intersect: false },
    };
  }

  buildYoYChart(): void {
    const d = this.dataService.getBtsYoY();
    const series = [
      { name: 'BTS 2024', data: d.pos2024 },
      { name: 'BTS 2026', data: d.pos2026 },
    ];
    this.yoyChartOptions = {
      series,
      chart:  { type: 'line', height: 420, toolbar: { show: false }, animations: { enabled: false } },
      stroke: { width: 2, curve: 'smooth', dashArray: [0, 4] },
      colors: ['#A0AEC0','#48BB78'],
      dataLabels: { enabled: false },
      xaxis:  { categories: d.labels, labels: { rotate: -30, style: { fontSize: '10px' } } },
      yaxis:  { title: { text: 'Unidades vendidas' } },
      legend: { position: 'top' },
      tooltip: { shared: true, intersect: false },
    };
  }

  buildFillRateChart(): void {
    const d = this.dataService.getBtsFillRateByCategory(6);
    this.fillRateChartOptions = {
      series: d.frSeries,
      chart:  { type: 'line', height: 420, toolbar: { show: false }, animations: { enabled: false } },
      stroke: { width: 2, curve: 'smooth' },
      dataLabels: { enabled: false },
      xaxis:  { categories: d.categories, title: { text: 'Semana' } },
      yaxis:  { min: 0, max: 100, title: { text: 'Fill Rate %' },
                labels: { formatter: (v: number) => v.toFixed(0) + '%' } },
      legend: { position: 'top', fontSize: '11px' },
      tooltip: { y: { formatter: (v: number) => v.toFixed(1) + '%' } },
      annotations: {
        yaxis: [{ y: 95, borderColor: '#FC8181', label: { text: 'Meta 95%', style: { color: '#fff', background: '#FC8181' } } }]
      },
    };
  }

  buildDohDistChart(): void {
    const d = this.dataService.getBtsDohRangeByCategory();
    const colors = ['#FC8181','#F6AD55','#F6E05E','#68D391','#4299E1','#9F7AEA','#CBD5E0'];
    this.dohDistChartOptions = {
      series: d.series,
      chart:  { type: 'bar', height: 420, stacked: true, toolbar: { show: false }, animations: { enabled: false } },
      colors,
      plotOptions: { bar: { horizontal: false, columnWidth: '65%' } },
      dataLabels:  { enabled: false },
      xaxis: { categories: d.categories, labels: { rotate: -30, style: { fontSize: '10px' } } },
      yaxis: { title: { text: 'Tiendas (conteo)' } },
      legend: { position: 'top', fontSize: '11px' },
      tooltip: { shared: true, intersect: false },
    };
  }

  buildIsChart(): void {
    const d = this.dataService.getBtsIsPerCategory();
    this.isChartOptions = {
      series: [
        { name: 'IS 1 Día',   data: d.is1d },
        { name: 'IS 3 Días',  data: d.is3d },
        { name: 'IS 7 Días',  data: d.is7d },
      ],
      chart:  { type: 'bar', height: 420, toolbar: { show: false }, animations: { enabled: false } },
      colors: ['#4299E1','#68D391','#F6AD55'],
      plotOptions: { bar: { horizontal: false, columnWidth: '70%', dataLabels: { position: 'top' } } },
      dataLabels:  { enabled: false },
      xaxis: { categories: d.categories, labels: { rotate: -30, style: { fontSize: '10px' } } },
      yaxis: { min: 0, max: 100, title: { text: 'InStock %' }, labels: { formatter: (v: number) => v.toFixed(0) + '%' } },
      legend: { position: 'top' },
      annotations: {
        yaxis: [{ y: 95, borderColor: '#FC8181', label: { text: '95%', style: { color: '#fff', background: '#FC8181' } } }]
      },
      tooltip: { y: { formatter: (v: number) => v.toFixed(1) + '%' } },
    };
  }

  onBubbleClick(pt: any): void {
    this.selectedBubble = {
      itemNbr:  pt.itemNbr,
      desc:     pt.name,
      doh:      pt.doh,
      agotados: pt.agotados,
      stores:   pt.stores,
      falta7d:  pt.falta7d,
      venta8sem: pt.ventaSem
    };
    this.btsStoreDetail = [];
    this.btsStoreDetailLoading = true;
    this.dataService.loadBtsStoreDetail(pt.itemNbr).subscribe({
      next: (data) => {
        this.btsStoreDetail = data.stores;
        this.btsStoreDetailSort = 'priority';
        this.btsStoreDetailDir = 'asc';
        this.storeFilters = {};
        this.storeFilterSearch = {};
        this.storeFilterOpen = null;
        this.applyStoreSort();
        this.btsStoreDetailLoading = false;
        this.cdr.detectChanges();
        // Scroll al panel
        setTimeout(() => {
          const el = document.getElementById('bts-store-detail-panel');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      },
      error: () => {
        this.btsStoreDetailLoading = false;
        this.btsStoreDetail = [];
        this.cdr.detectChanges();
      }
    });
  }

  sortStoreBy(col: keyof BtsStoreDetail | 'priority'): void {
    if (this.btsStoreDetailSort === col) {
      this.btsStoreDetailDir = this.btsStoreDetailDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.btsStoreDetailSort = col;
      const descByDefault: Array<keyof BtsStoreDetail | 'priority'> =
        ['venta8sem','falta7d','falta3d','falta1d','agotado','onHand','inTransit','inWhse','onOrder','promDia'];
      this.btsStoreDetailDir = descByDefault.includes(col) ? 'desc' : 'asc';
    }
    this.applyStoreSort();
    this.cdr.detectChanges();
  }

  private applyStoreSort(): void {
    // 1. Apply active filters
    let list = this.btsStoreDetail.filter(s => {
      for (const col of Object.keys(this.storeFilters)) {
        const active = this.storeFilters[col];
        if (active && active.size > 0) {
          const val = String((s as any)[col]);
          if (!active.has(val)) return false;
        }
      }
      return true;
    });

    // 2. Sort
    const col = this.btsStoreDetailSort;
    const dir = this.btsStoreDetailDir === 'asc' ? 1 : -1;

    if (col === 'priority') {
      this.sortedBtsStoreDetail = list.sort((a, b) =>
        (b.agotado - a.agotado) || (a.doh - b.doh) || (b.venta8sem - a.venta8sem)
      );
      return;
    }

    this.sortedBtsStoreDetail = list.sort((a, b) => {
      const av = (a as any)[col];
      const bv = (b as any)[col];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  storeSortIcon(col: keyof BtsStoreDetail | 'priority'): string {
    if (this.btsStoreDetailSort !== col) return 'unfold_more';
    return this.btsStoreDetailDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  // ── Filter helpers ─────────────────────────────────────────────────────────
  toggleFilterDropdown(col: string, event: Event): void {
    event.stopPropagation();
    if (this.storeFilterOpen === col) {
      this.storeFilterOpen = null;
      this.cdr.detectChanges();
      return;
    }
    const btn = (event.currentTarget as HTMLElement);
    const rect = btn.getBoundingClientRect();
    this.storeFilterPos = { top: rect.bottom + 4, left: rect.left };
    this.storeFilterOpen = col;
    if (!this.storeFilterSearch[col]) this.storeFilterSearch[col] = '';
    this.cdr.detectChanges();
  }

  closeFilterDropdown(): void {
    this.storeFilterOpen = null;
    this.cdr.detectChanges();
  }

  getFilterOptions(col: string): string[] {
    const search = (this.storeFilterSearch[col] || '').toLowerCase();
    const unique = [...new Set(this.btsStoreDetail.map(s => String((s as any)[col])))];
    unique.sort((a, b) => {
      const na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    return search ? unique.filter(v => v.toLowerCase().includes(search)) : unique;
  }

  isFilterValueActive(col: string, val: string): boolean {
    return !this.storeFilters[col] || this.storeFilters[col].size === 0 || this.storeFilters[col].has(val);
  }

  toggleFilterValue(col: string, val: string, event: Event): void {
    event.stopPropagation();
    if (!this.storeFilters[col]) {
      // First interaction: activate all then remove this one → "all except val"
      // Better: start with empty set meaning "no filter" → first click means "only val"
      this.storeFilters[col] = new Set(this.btsStoreDetail.map(s => String((s as any)[col])));
    }
    const set = this.storeFilters[col];
    if (set.has(val)) {
      set.delete(val);
    } else {
      set.add(val);
    }
    // If all are selected, treat as no filter
    const allVals = new Set(this.btsStoreDetail.map(s => String((s as any)[col])));
    if (set.size === allVals.size) {
      delete this.storeFilters[col];
    }
    this.applyStoreSort();
    this.cdr.detectChanges();
  }

  selectAllFilter(col: string, event: Event): void {
    event.stopPropagation();
    delete this.storeFilters[col];
    this.applyStoreSort();
    this.cdr.detectChanges();
  }

  clearFilter(col: string, event: Event): void {
    event.stopPropagation();
    this.storeFilters[col] = new Set();
    this.applyStoreSort();
    this.cdr.detectChanges();
  }

  hasActiveFilter(col: string): boolean {
    return !!this.storeFilters[col] && this.storeFilters[col].size > 0 &&
           this.storeFilters[col].size < new Set(this.btsStoreDetail.map(s => String((s as any)[col]))).size;
  }

  isAllSelected(col: string): boolean {
    return !this.storeFilters[col] || this.storeFilters[col].size === 0 ||
           this.storeFilters[col].size === new Set(this.btsStoreDetail.map(s => String((s as any)[col]))).size;
  }

  clearAllFilters(): void {
    this.storeFilters = {};
    this.applyStoreSort();
    this.cdr.detectChanges();
  }

  get activeFilterCount(): number {
    return Object.keys(this.storeFilters).filter(k => this.hasActiveFilter(k)).length;
  }

  getStoreRowClass(s: BtsStoreDetail): string {
    if (s.agotado) return 'store-row-agotado';
    if (s.doh < 50) return 'store-row-red';
    if (s.doh < 60) return 'store-row-orange';
    if (s.doh <= 70) return 'store-row-yellow';
    return '';
  }

  buildDesvChart(): void {
    const d = this.dataService.getBtsDesvByCategory();
    const colors = d.desvPct.map(v => v > 0 ? '#FC8181' : '#68D391');
    this.desvChartOptions = {
      series: [{ name: '% Desviación Forecast', data: d.desvPct }],
      chart:  { type: 'bar', height: 420, toolbar: { show: false }, animations: { enabled: false } },
      colors,
      plotOptions: { bar: { horizontal: false, distributed: true, columnWidth: '65%' } },
      dataLabels:  { enabled: true, formatter: (v: number) => v.toFixed(1) + '%' },
      xaxis: { categories: d.categories, labels: { rotate: -30, style: { fontSize: '10px' } } },
      yaxis: { title: { text: '% Desviación' }, labels: { formatter: (v: number) => v.toFixed(0) + '%' } },
      legend: { show: false },
      annotations: { yaxis: [{ y: 0, borderColor: '#718096', strokeDashArray: 4 }] },
      tooltip: { y: { formatter: (v: number) => v.toFixed(1) + '%' } },
    };
  }

  // ── Helpers privados ──────────────────────────────────────────────────────
  private generateDetailedPredictions(): any {
    return {
      weeklyForecast: Array.from({ length: 12 }, (_, i) => ({
        week: i + 1,
        predicted: Math.floor(Math.random() * 500) + 300,
        confidence: 85 + Math.random() * 10
      })),
      recommendations: [
        'Aumentar stock en un 15% para las próximas 4 semanas',
        'Programar reabastecimiento cada 2 semanas',
        'Considerar promoción para incrementar rotación'
      ],
      riskFactors: [
        'Demanda estacional alta en próximos meses',
        'Posible escasez de materia prima'
      ]
    };
  }

  private generateTrendAnalysis(): any {
    const categories = new Map<string, number>();
    this.csvProducts.forEach(p => {
      const cat = p.category || 'Sin categoría';
      categories.set(cat, (categories.get(cat) || 0) + 1);
    });
    const categoryDistribution = Array.from(categories.entries()).map(([name, count]) => ({
      name, count, percentage: (count / this.csvProducts.length * 100).toFixed(1)
    }));
    return {
      totalProducts: this.csvProducts.length,
      categoryDistribution,
      topProducts: this.csvProducts.slice(0, 10).map(p => ({ name: p.cleanName || p.descripcion, upc: p.upc, category: p.category || 'Sin categoría' })),
      recommendations: ['Enfocar en categorías de alta rotación: Escritura y Manualidades']
    };
  }
}
