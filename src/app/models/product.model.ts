export interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  weeklyDemand: number;
  price: number;
  historicalData: number[];
  prediction: number[];
  // Métricas Kommerco × Walmart
  doh: number;              // Days On Hand (días de cobertura en tienda WM)
  inStockPct: number;       // % combinaciones artículo-tienda con inventario > 0
  storeCount?: number;      // Número de tiendas activas con el artículo
  isSeasonalOnly?: boolean; // true = solo estacional (ej. calculadora BTS), excluir de top críticos permanentes
  // Campos opcionales heredados
  reorderPoint?: number;
  safetyStock?: number;
  leadTime?: number;
  lastOrderDate?: string;
  forecastError?: number;
  confidenceLevel?: number;
}

export interface ChartData {
  categories: string[];
  series: {
    name: string;
    data: number[];
    color?: string;
  }[];
}
