import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Product } from '../models/product.model';

// ── Interfaces para datos reales BTS (Excel → JSON) ──────────────────────────

export interface BtsItemKPI {
  itemNbr:    number;
  vsn:        string;
  desc:       string;
  categoria:  string;
  formato:    string;
  promSem:    number;
  is1d:       number;   // InStock % a 1 día (0-100)
  is3d:       number;
  is7d:       number;
  doh:        number;
  dtr:        number;   // días en tránsito
  dwh:        number;   // días en bodega
  dor:        number;   // días en orden
  dtt:        number;   // pipeline total
  agotados:   number;
  dohRanges:  { d1_15: number; d16_30: number; d31_50: number; d51_70: number; d71_90: number; d91_120: number; dgt120: number; sinVta: number };
  resurtible: number;
  fillRate:   Record<string, number>;  // sem50...sem10
  desvPct:    Record<string, number>;  // sem13..sem16
  disponible: number;
  cuarentena: number;
  abril:      number;
  mayo:       number;
  junio:      number;
}

export interface BtsWeekly2026 {
  itemNbr:    number;
  desc:       string;
  categoria:  string;
  formato:    string;
  itemStatus: string;
  mbm:        string;
  book:       string;
  resurtible: number;
  vnpk:       number;
  pos2026:    Record<string, number>;   // 202604..202612
  fcst2026:   Record<string, number>;   // 202603..202616
  inv:        { inTransit: number; onHand: number; inWhse: number; onOrder: number };
  promDia:    number;
  falta1d:    number;
  falta3d:    number;
  falta7d:    number;
  dohAvg:     number;
  agotados:   number;
  storeCount: number;
  mensual:    { abril: number; mayo: number; junio: number };
}

export interface BtsWeekly2024 {
  itemNbr: number;
  desc:    string;
  pos2024: Record<string, number>;  // 202417..202448
  oh2024:  Record<string, number>;
}

export interface BtsStoreDetail {
  storeNbr:   number;
  storeName:  string;
  storeType:  string;
  formato:    string;
  whseNbr:    number;
  onHand:     number;
  inTransit:  number;
  inWhse:     number;
  onOrder:    number;
  promDia:    number;
  doh:        number;
  agotado:    number;
  falta1d:    number;
  falta3d:    number;
  falta7d:    number;
  venta8sem:  number;
  resurtible: string;
}

export interface BtsStoreGroup {
  itemNbr:    number;
  desc:       string;
  whseNbr:    number;
  formato:    string;
  storeCount: number;
  agotados:   number;
  dohAvg:     number;
  falta1d:    number;
  falta3d:    number;
  falta7d:    number;
  venta8sem:  number;
  promDia:    number;
}

export interface BtsProduct extends Product {
  inTransit:         number;
  inWarehouse:       number;
  onOrder:           number;
  forecastRetail:    number;
  vendorPack:        number;
  cedis:             string;
  formato:           string;
  itemStatus:        string;
  mbm:               string;
  book:              string;
  isResurtible:      boolean;
  abc:               string;
  dailySales:        number;
  dohPipeline:       number;
  shortage1d:        number;
  shortage3d:        number;
  shortage7d:        number;
  storesStockout:    number;
  forecastDeviation: number;
}

export interface OrderLine {
  cedis:               string;
  formato:             string;
  articulo:            string;
  upc:                 string;
  unidadesNecesarias:  number;
  cajasRequeridas:     number;
  unidadesTotales:     number;
}

export interface CSVProduct {
  upc: string;
  codigoWM2: string;
  itemFlags: string;
  descripcion: string;
  category?: string;
  cleanName?: string;
}

export interface HighlightedPrediction {
  productId: string;
  productName: string;
  currentDemand: number;
  predictedDemand: number;
  changePercent: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export type DohLevel = 'red' | 'orange' | 'yellow' | 'green';

export interface DohDistribution {
  red: number;
  orange: number;
  yellow: number;
  green: number;
}

export interface StoreCatalogEntry {
  storeName: string;
  formato:   string;
  whseNbr:   number;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private productsSubject       = new BehaviorSubject<Product[]>([]);
  private csvProductsSubject    = new BehaviorSubject<CSVProduct[]>([]);
  private btsItemsSubject       = new BehaviorSubject<BtsItemKPI[]>([]);
  private btsWeekly2026Subject  = new BehaviorSubject<BtsWeekly2026[]>([]);
  private btsWeekly2024Subject  = new BehaviorSubject<BtsWeekly2024[]>([]);
  private btsStoreGroupsSubject = new BehaviorSubject<BtsStoreGroup[]>([]);
  private storeCatalogMap       = new Map<number, StoreCatalogEntry>();

  products$:        Observable<Product[]>        = this.productsSubject.asObservable();
  csvProducts$:     Observable<CSVProduct[]>     = this.csvProductsSubject.asObservable();
  btsItems$:        Observable<BtsItemKPI[]>     = this.btsItemsSubject.asObservable();
  btsWeekly2026$:   Observable<BtsWeekly2026[]>  = this.btsWeekly2026Subject.asObservable();
  btsWeekly2024$:   Observable<BtsWeekly2024[]>  = this.btsWeekly2024Subject.asObservable();
  btsStoreGroups$:  Observable<BtsStoreGroup[]>  = this.btsStoreGroupsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadMockData();
    this.loadBtsRealData();
  }

  private loadBtsRealData(): void {
    this.http.get<BtsItemKPI[]>('assets/bts-items.json').subscribe(d => this.btsItemsSubject.next(d));
    this.http.get<BtsWeekly2026[]>('assets/bts-weekly-2026.json').subscribe(d => this.btsWeekly2026Subject.next(d));
    this.http.get<BtsWeekly2024[]>('assets/bts-weekly-2024.json').subscribe(d => this.btsWeekly2024Subject.next(d));
    this.http.get<BtsStoreGroup[]>('assets/bts-store-groups.json').subscribe(d => this.btsStoreGroupsSubject.next(d));
    this.http.get('assets/diccionarioCedisTiendas.csv', { responseType: 'text' }).subscribe(text => {
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length < 4) continue;
        const nbr = parseInt(parts[0].trim(), 10);
        if (isNaN(nbr)) continue;
        this.storeCatalogMap.set(nbr, {
          storeName: parts[1].trim(),
          formato:   parts[2].trim(),
          whseNbr:   parseInt(parts[3].trim(), 10) || 0,
        });
      }
    });
  }

  // ── Helpers para gráficas BTS ─────────────────────────────────────────────

  /** Ventas 2026 vs Forecast por semana (agregado total) */
  getBtsSales2026VsFcst(): { weeks: string[]; posActual: number[]; forecast: number[] } {
    const items = this.btsWeekly2026Subject.value;
    const weeks2026 = ['202604','202605','202606','202607','202608','202609','202610','202612'];
    const fcstWeeks = ['202604','202605','202606','202607','202608','202609','202610','202612'];
    const posMap: Record<string, number> = {};
    const fcstMap: Record<string, number> = {};
    weeks2026.forEach(w => { posMap[w] = 0; fcstMap[w] = 0; });
    items.forEach(it => {
      weeks2026.forEach(w => { posMap[w] += it.pos2026[w] || 0; });
      fcstWeeks.forEach(w => { fcstMap[w] += it.fcst2026[w] || 0; });
    });
    return {
      weeks: weeks2026.map(w => 'Sem ' + w.slice(4)),
      posActual: weeks2026.map(w => posMap[w]),
      forecast:  weeks2026.map(w => Math.round(fcstMap[w])),
    };
  }

  /** Fill Rate promedio por semana (sem50..sem10) para top N categorías */
  getBtsFillRateByCategory(topN = 5): { categories: string[]; frSeries: { name: string; data: number[] }[] } {
    const items = this.btsItemsSubject.value;
    const frKeys = ['sem50','sem51','sem52','sem1','sem2','sem3','sem4','sem5','sem6','sem7','sem8','sem9','sem10'];
    const catMap: Record<string, { sum: Record<string, number>; count: number }> = {};
    items.forEach(it => {
      const cat = it.categoria || 'OTROS';
      if (!catMap[cat]) catMap[cat] = { sum: {}, count: 0 };
      catMap[cat].count++;
      frKeys.forEach(k => { catMap[cat].sum[k] = (catMap[cat].sum[k] || 0) + (it.fillRate[k] || 0); });
    });
    const sorted = Object.entries(catMap).sort((a, b) => b[1].count - a[1].count).slice(0, topN);
    const frSeries = sorted.map(([cat, d]) => ({
      name: cat,
      data: frKeys.map(k => parseFloat((d.sum[k] / d.count).toFixed(1)))
    }));
    return { categories: frKeys.map(k => k.replace('sem', 'S')), frSeries };
  }

  /** DOH ranges por categoría (stacked bar) */
  getBtsDohRangeByCategory(): { categories: string[]; series: { name: string; data: number[] }[] } {
    const items = this.btsItemsSubject.value;
    const rangeKeys = ['d1_15','d16_30','d31_50','d51_70','d71_90','d91_120','dgt120'] as const;
    const rangeLabels = ['1-15','16-30','31-50','51-70','71-90','91-120','>120'];
    const catMap: Record<string, Record<string, number>> = {};
    items.forEach(it => {
      const cat = it.categoria || 'OTROS';
      if (!catMap[cat]) { catMap[cat] = {}; rangeKeys.forEach(k => catMap[cat][k] = 0); }
      rangeKeys.forEach(k => catMap[cat][k] = (catMap[cat][k] || 0) + it.dohRanges[k]);
    });
    const cats = Object.keys(catMap).sort();
    const series = rangeKeys.map((k, i) => ({
      name: rangeLabels[i],
      data: cats.map(c => catMap[c][k])
    }));
    return { categories: cats, series };
  }

  /** InStock % promedio 1D/3D/7D por categoría */
  getBtsIsPerCategory(): { categories: string[]; is1d: number[]; is3d: number[]; is7d: number[] } {
    const items = this.btsItemsSubject.value;
    const catMap: Record<string, { s1: number; s3: number; s7: number; n: number }> = {};
    items.forEach(it => {
      const cat = it.categoria || 'OTROS';
      if (!catMap[cat]) catMap[cat] = { s1: 0, s3: 0, s7: 0, n: 0 };
      catMap[cat].s1 += it.is1d; catMap[cat].s3 += it.is3d; catMap[cat].s7 += it.is7d; catMap[cat].n++;
    });
    const cats = Object.keys(catMap).sort();
    return {
      categories: cats,
      is1d: cats.map(c => parseFloat((catMap[c].s1 / catMap[c].n).toFixed(1))),
      is3d: cats.map(c => parseFloat((catMap[c].s3 / catMap[c].n).toFixed(1))),
      is7d: cats.map(c => parseFloat((catMap[c].s7 / catMap[c].n).toFixed(1))),
    };
  }

  /** YoY: ventas semanales 2024 vs 2026 alineadas por posición BTS */
  getBtsYoY(): { labels: string[]; pos2024: number[]; pos2026: number[] } {
    const items2024 = this.btsWeekly2024Subject.value;
    const items2026 = this.btsWeekly2026Subject.value;
    // 2024 BTS: semanas 17-34 (18 semanas)
    const wks2024 = Array.from({length: 18}, (_, i) => String(202400 + 17 + i));
    // 2026: semanas 4-12 (8 semanas)
    const wks2026 = ['202604','202605','202606','202607','202608','202609','202610','202612'];
    const maxLen = Math.max(wks2024.length, wks2026.length);
    const pos2024 = wks2024.map(w => items2024.reduce((s, it) => s + (it.pos2024[w] || 0), 0));
    const pos2026 = wks2026.map(w => items2026.reduce((s, it) => s + (it.pos2026[w] || 0), 0));
    // Pad 2026 with nulls to match length
    while (pos2026.length < pos2024.length) pos2026.push(0);
    const labels = Array.from({length: maxLen}, (_, i) => 'BTS Sem ' + (i + 1));
    return { labels, pos2024, pos2026 };
  }

  /** Desviación de forecast por categoría (%DESV promedio sem13-16) */
  getBtsDesvByCategory(): { categories: string[]; desvPct: number[] } {
    const items = this.btsItemsSubject.value;
    const catMap: Record<string, { sum: number; n: number }> = {};
    items.forEach(it => {
      const cat = it.categoria || 'OTROS';
      if (!catMap[cat]) catMap[cat] = { sum: 0, n: 0 };
      const vals = Object.values(it.desvPct).filter(v => v !== 0);
      if (vals.length) { catMap[cat].sum += vals.reduce((a, b) => a + b, 0) / vals.length; catMap[cat].n++; }
    });
    const cats = Object.keys(catMap).sort();
    return {
      categories: cats,
      desvPct: cats.map(c => catMap[c].n ? parseFloat((catMap[c].sum / catMap[c].n).toFixed(1)) : 0),
    };
  }

  /** KPIs globales desde datos reales */
  getBtsRealKPIs() {
    const items = this.btsItemsSubject.value;
    if (!items.length) return { avgIs1d: 0, avgIs7d: 0, avgDoh: 0, totalAgotados: 0, totalResurtible: 0, totalItems: 0 };
    const n = items.length;
    return {
      avgIs1d:        parseFloat((items.reduce((s, i) => s + i.is1d, 0) / n).toFixed(1)),
      avgIs7d:        parseFloat((items.reduce((s, i) => s + i.is7d, 0) / n).toFixed(1)),
      avgDoh:         parseFloat((items.reduce((s, i) => s + i.doh,  0) / n).toFixed(1)),
      totalAgotados:  items.reduce((s, i) => s + i.agotados, 0),
      totalResurtible: items.reduce((s, i) => s + i.resurtible, 0),
      totalItems:     n,
    };
  }

  getBtsItems():        BtsItemKPI[]     { return this.btsItemsSubject.value; }
  getBtsWeekly2026():   BtsWeekly2026[]  { return this.btsWeekly2026Subject.value; }
  getBtsWeekly2024():   BtsWeekly2024[]  { return this.btsWeekly2024Subject.value; }
  getBtsStoreGroups():  BtsStoreGroup[]  { return this.btsStoreGroupsSubject.value; }
  getStoreCatalog():    Map<number, StoreCatalogEntry> { return this.storeCatalogMap; }

  loadBtsStoreDetail(itemNbr: number): Observable<{ itemNbr: number; stores: BtsStoreDetail[] }> {
    return this.http.get<{ itemNbr: number; stores: BtsStoreDetail[] }>(`assets/bts-stores/${itemNbr}.json`);
  }

  // ── Mock data realista Kommerco × Walmart ────────────────────────────────
  private loadMockData(): void {
    const mockProducts: Product[] = [
      // ── ROJO (DOH < 50) ──────────────────────────────────────────────────
      {
        id: '750649501199',
        name: 'Lápiz Grafito #2 c/12',
        category: 'Escritura',
        currentStock: 3200,
        weeklyDemand: 1200,
        price: 0.99,
        doh: 26,
        inStockPct: 82.4,
        storeCount: 812,
        isSeasonalOnly: false,
        historicalData: this.genHist(200, 1200),
        prediction: this.genPred(220, 1400)
      },
      {
        id: '750649502010',
        name: 'Bolígrafo Azul 1.0mm',
        category: 'Escritura',
        currentStock: 4800,
        weeklyDemand: 850,
        price: 2.49,
        doh: 39,
        inStockPct: 87.1,
        storeCount: 756,
        isSeasonalOnly: false,
        historicalData: this.genHist(150, 900),
        prediction: this.genPred(170, 1050)
      },
      {
        id: '750649503301',
        name: 'Adhesivo Silicón Líquido 120ml',
        category: 'Adhesivos',
        currentStock: 1100,
        weeklyDemand: 320,
        price: 4.99,
        doh: 48,
        inStockPct: 88.9,
        storeCount: 634,
        isSeasonalOnly: false,
        historicalData: this.genHist(80, 350),
        prediction: this.genPred(90, 400)
      },
      // ── NARANJA (DOH 50-59) ──────────────────────────────────────────────
      {
        id: '750649504220',
        name: 'Cuaderno Profesional A4 100h',
        category: 'Cuadernos',
        currentStock: 5600,
        weeklyDemand: 680,
        price: 15.99,
        doh: 52,
        inStockPct: 91.3,
        storeCount: 798,
        isSeasonalOnly: false,
        historicalData: this.genHist(400, 750),
        prediction: this.genPred(420, 850)
      },
      {
        id: '750649505180',
        name: 'Plastilina Escolar Rosa 200g',
        category: 'Manualidades',
        currentStock: 2900,
        weeklyDemand: 390,
        price: 3.49,
        doh: 56,
        inStockPct: 90.8,
        storeCount: 581,
        isSeasonalOnly: false,
        historicalData: this.genHist(100, 420),
        prediction: this.genPred(110, 480)
      },
      {
        id: '750649506044',
        name: 'Acuarela Escolar 12 Colores',
        category: 'Manualidades',
        currentStock: 1750,
        weeklyDemand: 210,
        price: 8.99,
        doh: 58,
        inStockPct: 92.0,
        storeCount: 502,
        isSeasonalOnly: false,
        historicalData: this.genHist(80, 240),
        prediction: this.genPred(85, 280)
      },
      // ── AMARILLO (DOH 60-70) ─────────────────────────────────────────────
      {
        id: '750649507115',
        name: 'Resma Papel Bond A4 80gr 500h',
        category: 'Papel',
        currentStock: 1350,
        weeklyDemand: 135,
        price: 22.99,
        doh: 63,
        inStockPct: 93.5,
        storeCount: 445,
        isSeasonalOnly: false,
        historicalData: this.genHist(60, 160),
        prediction: this.genPred(65, 185)
      },
      {
        id: '750649508250',
        name: 'Folder Manila Tamaño Carta x25',
        category: 'Organización',
        currentStock: 3200,
        weeklyDemand: 340,
        price: 1.99,
        doh: 66,
        inStockPct: 94.1,
        storeCount: 612,
        isSeasonalOnly: false,
        historicalData: this.genHist(100, 380),
        prediction: this.genPred(110, 420)
      },
      {
        id: '750649509090',
        name: 'Marcador Fluorescente x4 Colores',
        category: 'Escritura',
        currentStock: 2100,
        weeklyDemand: 220,
        price: 5.49,
        doh: 67,
        inStockPct: 93.8,
        storeCount: 529,
        isSeasonalOnly: false,
        historicalData: this.genHist(70, 250),
        prediction: this.genPred(75, 290)
      },
      {
        id: '750649510033',
        name: 'Sacapuntas Metálico Doble Agujero',
        category: 'Escritura',
        currentStock: 4500,
        weeklyDemand: 450,
        price: 1.29,
        doh: 70,
        inStockPct: 95.2,
        storeCount: 741,
        isSeasonalOnly: false,
        historicalData: this.genHist(120, 500),
        prediction: this.genPred(130, 560)
      },
      // ── VERDE (DOH > 70) ─────────────────────────────────────────────────
      {
        id: '750649511400',
        name: 'Crayones Escolares x16 Colores',
        category: 'Manualidades',
        currentStock: 6800,
        weeklyDemand: 580,
        price: 4.29,
        doh: 78,
        inStockPct: 96.4,
        storeCount: 823,
        isSeasonalOnly: false,
        historicalData: this.genHist(200, 640),
        prediction: this.genPred(210, 720)
      },
      {
        id: '750649512205',
        name: 'Compás Escolar Metálico',
        category: 'Geometría',
        currentStock: 1200,
        weeklyDemand: 95,
        price: 9.99,
        doh: 84,
        inStockPct: 96.9,
        storeCount: 389,
        isSeasonalOnly: false,
        historicalData: this.genHist(30, 110),
        prediction: this.genPred(35, 130)
      },
      {
        id: '750649513070',
        name: 'Regla 30cm Transparente',
        category: 'Geometría',
        currentStock: 5500,
        weeklyDemand: 380,
        price: 0.79,
        doh: 96,
        inStockPct: 97.5,
        storeCount: 755,
        isSeasonalOnly: false,
        historicalData: this.genHist(100, 420),
        prediction: this.genPred(110, 480)
      },
      {
        id: '750649514088',
        name: 'Engrapadora Escritorio 24/6',
        category: 'Organización',
        currentStock: 980,
        weeklyDemand: 62,
        price: 12.99,
        doh: 105,
        inStockPct: 97.8,
        storeCount: 312,
        isSeasonalOnly: false,
        historicalData: this.genHist(20, 75),
        prediction: this.genPred(22, 90)
      },
      {
        id: '750649515099',
        name: 'Calculadora Científica 240 Funciones',
        category: 'Matemáticas',
        currentStock: 2400,
        weeklyDemand: 130,
        price: 18.99,
        doh: 129,
        inStockPct: 98.1,
        storeCount: 298,
        isSeasonalOnly: true,  // BTS estacional
        historicalData: this.genHist(30, 160),
        prediction: this.genPred(35, 190)
      }
    ];

    this.productsSubject.next(mockProducts);
  }

  // ── Métodos de semáforo ──────────────────────────────────────────────────

  /** Semáforo DOH según reglas Javier Pérez */
  getDohSemaphore(doh: number): DohLevel {
    if (doh < 50)  return 'red';
    if (doh < 60)  return 'orange';
    if (doh <= 70) return 'yellow';
    return 'green';
  }

  /** Semáforo InStock % según umbrales Javier */
  getInStockSemaphore(pct: number): DohLevel {
    if (pct < 90)  return 'red';
    if (pct < 92)  return 'orange';
    if (pct < 95)  return 'yellow';
    return 'green';
  }

  /** Top 10 artículos críticos: menor DOH, excluye estacionales puros */
  getTop10Critical(): Product[] {
    return this.productsSubject.value
      .filter(p => !p.isSeasonalOnly)
      .sort((a, b) => a.doh - b.doh)
      .slice(0, 10);
  }

  /** Promedio ponderado de InStock % (ponderado por número de tiendas) */
  getGlobalInStock(): number {
    const products = this.productsSubject.value;
    if (!products.length) return 0;
    const totalStores = products.reduce((s, p) => s + (p.storeCount || 0), 0);
    if (!totalStores) return 0;
    const weighted = products.reduce((s, p) => s + p.inStockPct * (p.storeCount || 0), 0);
    return parseFloat((weighted / totalStores).toFixed(1));
  }

  /** Distribución de artículos por zona de semáforo DOH */
  getDohDistribution(): DohDistribution {
    const dist: DohDistribution = { red: 0, orange: 0, yellow: 0, green: 0 };
    this.productsSubject.value.forEach(p => {
      dist[this.getDohSemaphore(p.doh)]++;
    });
    return dist;
  }

  /** DOH promedio de todos los artículos */
  getAvgDoh(): number {
    const products = this.productsSubject.value;
    if (!products.length) return 0;
    return Math.round(products.reduce((s, p) => s + p.doh, 0) / products.length);
  }

  // ── Métodos existentes (sin cambios) ─────────────────────────────────────

  parseCSV(csvContent: string): CSVProduct[] {
    const lines = csvContent.split('\n');
    const products: CSVProduct[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(';');
      if (parts.length >= 4) {
        let upc = parts[0].trim()
          .replace(/^\uFEFF/, '')
          .replace(/^ï»¿/, '')
          .replace(/"/g, '');
        const descripcion = parts[3]?.trim() || '';
        const product: CSVProduct = {
          upc,
          codigoWM2: parts[1]?.trim() || '',
          itemFlags:  parts[2]?.trim() || '',
          descripcion
        };
        if (product.upc && product.upc !== 'UPC') {
          products.push({
            ...product,
            category:  this.detectCategory(descripcion),
            cleanName: this.cleanProductName(descripcion)
          });
        }
      }
    }
    return products;
  }

  loadCSVData(products: CSVProduct[]): void {
    this.csvProductsSubject.next(products);
    const systemProducts = products.slice(0, 50).map((csv, i) => ({
      id:            `CSV-${String(i + 1).padStart(3, '0')}`,
      name:          csv.cleanName || this.cleanProductName(csv.descripcion),
      category:      csv.category  || this.detectCategory(csv.descripcion),
      currentStock:  Math.floor(Math.random() * 10000) + 100,
      weeklyDemand:  Math.floor(Math.random() * 500) + 50,
      price:         parseFloat((Math.random() * 50 + 1).toFixed(2)),
      doh:           Math.floor(Math.random() * 120) + 20,
      inStockPct:    parseFloat((80 + Math.random() * 18).toFixed(1)),
      storeCount:    Math.floor(Math.random() * 600) + 100,
      historicalData: this.genHist(50, 300),
      prediction:     this.genPred(55, 350)
    } as Product));
    this.productsSubject.next([...this.productsSubject.value, ...systemProducts]);
  }

  detectCategory(descripcion: string): string {
    const d = descripcion.toLowerCase();
    if (d.includes('plastilina') || d.includes('crayon') || d.includes('acuarela') || d.includes('pint')) return 'Manualidades';
    if (d.includes('bol') || d.includes('lapiz') || d.includes('marcador') || d.includes('plum')) return 'Escritura';
    if (d.includes('papel') || d.includes('cartul') || d.includes('foamy') || d.includes('block')) return 'Papel';
    if (d.includes('goma') || d.includes('peg') || d.includes('adhesivo') || d.includes('silicon')) return 'Adhesivos';
    if (d.includes('regla') || d.includes('compas') || d.includes('geometria')) return 'Geometría';
    if (d.includes('folder') || d.includes('carpeta') || d.includes('sobre') || d.includes('archiv')) return 'Organización';
    if (d.includes('calculadora') || d.includes('abaco')) return 'Matemáticas';
    if (d.includes('cuaderno') || d.includes('libreta')) return 'Cuadernos';
    return 'Oficina';
  }

  cleanProductName(descripcion: string): string {
    let name = descripcion.replace(/^P[+&]?G\s*/i, '').trim();
    name = name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return name;
  }

  // ── BTS Operativo ─────────────────────────────────────────────────────────
  getBtsProducts(): BtsProduct[] {
    const products = this.productsSubject.value;
    const sorted   = [...products].sort((a, b) => b.weeklyDemand - a.weeklyDemand);
    const topN     = Math.ceil(products.length * 0.2);
    const topIds   = new Set(sorted.slice(0, topN).map(p => p.id));

    const cedisByCat: Record<string, string> = {
      'Escritura': 'CDMX', 'Cuadernos': 'CDMX',
      'Manualidades': 'GDL', 'Papel': 'GDL',
      'Geometría': 'MTY', 'Organización': 'MTY',
      'Matemáticas': 'MTY', 'Adhesivos': 'MTY'
    };

    return products.map((p, i) => {
      const dailySales   = parseFloat((p.weeklyDemand / 7).toFixed(1));
      const inTransit    = Math.round(p.weeklyDemand * this.sr(i * 3,  50, 200) / 100);
      const inWarehouse  = Math.round(p.weeklyDemand * this.sr(i * 7,  30, 150) / 100);
      const onOrder      = Math.round(p.weeklyDemand * this.sr(i * 11,  0, 200) / 100);
      const dohPipeline  = Math.round((p.currentStock + inTransit + inWarehouse + onOrder) / dailySales);
      const shortage1d   = Math.max(0, Math.round(dailySales     - p.currentStock));
      const shortage3d   = Math.max(0, Math.round(dailySales * 3 - p.currentStock));
      const shortage7d   = Math.max(0, Math.round(dailySales * 7 - p.currentStock));
      const forecastRetail   = Math.round(p.weeklyDemand * (0.8 + this.sr(i * 13, 0, 40) / 100));
      const forecastDeviation = parseFloat(((p.weeklyDemand - forecastRetail) / forecastRetail * 100).toFixed(1));
      const itemStatus   = i % 7 === 0 ? 'I' : 'A';
      const mbm          = i % 9 === 0 ? 'N' : 'M';
      const book         = i % 11 === 0 ? 'N' : 'Y';
      return {
        ...p,
        inTransit, inWarehouse, onOrder, forecastRetail,
        vendorPack: 12,
        cedis:   cedisByCat[p.category] || 'CDMX',
        formato: (p.storeCount || 0) > 600 ? 'Bodega' : 'Sucursal',
        itemStatus, mbm, book,
        isResurtible: itemStatus === 'A' && mbm === 'M' && book === 'Y',
        abc:           topIds.has(p.id) ? 'A' : 'B',
        dailySales, dohPipeline,
        shortage1d, shortage3d, shortage7d,
        storesStockout:    Math.round((p.storeCount || 0) * (1 - p.inStockPct / 100)),
        forecastDeviation
      } as BtsProduct;
    });
  }

  getOrderConsolidated(products: BtsProduct[]): OrderLine[] {
    return products
      .filter(p => p.isResurtible && p.shortage7d > 0)
      .map(p => {
        const unidadesNecesarias = Math.round(p.shortage7d + p.dailySales * 14);
        const cajasRequeridas    = Math.ceil(unidadesNecesarias / p.vendorPack);
        return {
          cedis:              p.cedis,
          formato:            p.formato,
          articulo:           p.name,
          upc:                p.id,
          unidadesNecesarias,
          cajasRequeridas,
          unidadesTotales:    cajasRequeridas * p.vendorPack
        };
      })
      .sort((a, b) => a.cedis.localeCompare(b.cedis) || a.formato.localeCompare(b.formato));
  }

  private sr(seed: number, min: number, max: number): number {
    const x = Math.sin(seed + 1) * 10000;
    return Math.floor((x - Math.floor(x)) * (max - min) + min);
  }

  getCSVProducts():        CSVProduct[] { return this.csvProductsSubject.value; }
  getAllProducts():        Product[]    { return this.productsSubject.value; }
  getProductByUPC(u: string) { return this.csvProductsSubject.value.find(p => p.upc === u); }
  getProductsByCategory(c: string) { return this.productsSubject.value.filter(p => p.category === c); }

  searchProduct(query: string): Product | null {
    return this.productsSubject.value.find(p =>
      p.id.toLowerCase().includes(query.toLowerCase()) ||
      p.name.toLowerCase().includes(query.toLowerCase())
    ) || null;
  }

  generateCSVPredictions(): HighlightedPrediction[] {
    return this.csvProductsSubject.value.slice(0, 10).map((csv, i) => {
      const change     = Math.floor(Math.random() * 60) + 5;
      const confidence = 70 + Math.random() * 25;
      return {
        productId:       `CSV-${String(i + 1).padStart(3, '0')}`,
        productName:     csv.cleanName || csv.descripcion.substring(0, 40),
        currentDemand:   Math.floor(Math.random() * 300) + 50,
        predictedDemand: Math.floor(Math.random() * 450) + 100,
        changePercent:   parseFloat(change.toFixed(1)),
        confidence:      parseFloat(confidence.toFixed(1)),
        riskLevel:       confidence > 85 ? 'low' : confidence > 75 ? 'medium' : 'high',
        recommendation:  this.generateRecommendation(change, confidence)
      };
    });
  }

  private generateRecommendation(change: number, confidence: number): string {
    if (change > 40 && confidence > 80) return 'Aumentar stock significativamente';
    if (change > 25 && confidence > 70) return 'Incrementar pedidos regulares';
    if (change < 10 && confidence > 85) return 'Reducir inventario gradualmente';
    return 'Mantener niveles actuales';
  }

  private genHist(min: number, max: number): number[] {
    return Array.from({ length: 12 }, () => Math.floor(Math.random() * (max - min)) + min);
  }

  private genPred(min: number, max: number): number[] {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * (max - min)) + min);
  }
}
