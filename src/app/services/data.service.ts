import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../models/product.model';

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

@Injectable({ providedIn: 'root' })
export class DataService {
  private productsSubject    = new BehaviorSubject<Product[]>([]);
  private csvProductsSubject = new BehaviorSubject<CSVProduct[]>([]);

  products$:    Observable<Product[]>    = this.productsSubject.asObservable();
  csvProducts$: Observable<CSVProduct[]> = this.csvProductsSubject.asObservable();

  constructor() {
    this.loadMockData();
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
