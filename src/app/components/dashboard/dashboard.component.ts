import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataService, CSVProduct, DohLevel } from '../../services/data.service';
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
  viewMode: 'operativo' | 'table' | 'csv' | 'prediction' | 'welcome' = 'operativo';

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

    // Suscribirse al NavigationService — el header controla la vista
    this.navSub = this.navService.view$.subscribe(view => {
      // Si piden CSV pero no hay productos cargados, volver a operativo
      if (view === 'csv' && this.csvProducts.length === 0) {
        this.navService.navigateTo('operativo');
        return;
      }
      this.viewMode = view;
      if (view !== 'prediction') this.selectedProduct = null;
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
