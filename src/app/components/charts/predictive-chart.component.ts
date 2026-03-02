import { Component, OnInit } from '@angular/core';

interface WeekEntry {
  week: string;
  value: number;
}

@Component({
  selector: 'app-predictive-chart',
  templateUrl: './predictive-chart.component.html',
  styleUrls: ['./predictive-chart.component.scss']
})
export class PredictiveChartComponent implements OnInit {
  public chartOptions: any;
  public upc: string = '';
  public mape: string = '';
  public r2: string = '';

  private predictionJson = {
    "upc": "750649501199",
    "ground_truth": [
      { "202548.0": 6.0 },
      { "202549.0": 2.0 },
      { "202550.0": 0.0 },
      { "202551.0": 1.0 },
      { "202552.0": 4.0 },
      { "202601.0": 6.0 },
      { "202602.0": 11.0 },
      { "202603.0": 0.0 }
    ],
    "test_data": [
      { "202548.0": 1.3529071807861328 },
      { "202549.0": 1.3529071807861328 },
      { "202550.0": 1.3529071807861328 },
      { "202551.0": 1.3459903001785278 },
      { "202552.0": 1.4872539043426514 },
      { "202601.0": 1.5384222269058228 },
      { "202602.0": 1.299057960510254 },
      { "202603.0": 1.5727591514587402 }
    ],
    "Mape": 46.22173526070335,
    "r2": -0.44596733875225114,
    "input_rows": 24,
    "predictions": [
      { "202603": 1.3529071807861328 },
      { "202604": 1.3529071807861328 },
      { "202605": 1.3529071807861328 },
      { "202606": 1.3459903001785278 },
      { "202607": 1.4872539043426514 },
      { "202608": 1.5384222269058228 },
      { "202609": 1.299057960510254 },
      { "202610": 1.5727591514587402 },
      { "202612": 1.290805697441101 },
      { "202613": 1.4130995273590088 },
      { "202614": 1.5381624698638916 },
      { "202615": 1.3237158060073853 },
      { "202616": 1.4813358783721924 },
      { "202617": 1.4080917835235596 },
      { "202618": 1.4723572731018066 },
      { "202619": 1.7673780918121338 }
    ],
    "status": "success"
  };

  constructor() {}

  ngOnInit(): void {
    this.buildChart();
  }

  private parseEntries(entries: { [key: string]: number }[]): WeekEntry[] {
    return entries.map(entry => {
      const key = Object.keys(entry)[0];
      return { week: key.replace('.0', ''), value: entry[key] };
    });
  }

  private formatWeekLabel(weekCode: string): string {
    const year = weekCode.substring(2, 4);
    const week = weekCode.substring(4);
    return `S${week}/${year}`;
  }

  private buildChart(): void {
    const data     = this.predictionJson;
    this.upc       = data.upc;
    this.mape      = data.Mape.toFixed(2);
    this.r2        = data.r2.toFixed(4);
    const mapeRate = data.Mape / 100;

    const groundTruth = this.parseEntries(data.ground_truth as any);
    const testData    = this.parseEntries(data.test_data as any);
    const predictions = this.parseEntries(data.predictions as any);

    // All unique weeks sorted (numeric string sort is correct for YYYYWW format)
    const allWeeksSet = new Set<string>();
    groundTruth.forEach(d => allWeeksSet.add(d.week));
    predictions.forEach(d => allWeeksSet.add(d.week));
    const allWeeks   = Array.from(allWeeksSet).sort();
    const categories = allWeeks.map(w => this.formatWeekLabel(w));
    const weekIndex  = new Map(allWeeks.map((w, i) => [w, i]));

    const mkNull = (): (number | null)[] => new Array(allWeeks.length).fill(null);

    const groundTruthSeries = mkNull();
    const testDataSeries    = mkNull();
    const predictionSeries  = mkNull();
    // Continuous band covering test + future prediction weeks
    const bandUpper         = mkNull();
    const bandLower         = mkNull();

    groundTruth.forEach(d => {
      const i = weekIndex.get(d.week);
      if (i !== undefined) groundTruthSeries[i] = d.value;
    });

    testData.forEach(d => {
      const i = weekIndex.get(d.week);
      if (i !== undefined) {
        testDataSeries[i] = parseFloat(d.value.toFixed(2));
        bandUpper[i]      = parseFloat((d.value * (1 + mapeRate)).toFixed(2));
        bandLower[i]      = parseFloat((Math.max(0, d.value * (1 - mapeRate))).toFixed(2));
      }
    });

    predictions.forEach(d => {
      const i = weekIndex.get(d.week);
      if (i !== undefined) {
        predictionSeries[i] = parseFloat(d.value.toFixed(2));
        // predictions overwrites test_data at overlap week 202603
        bandUpper[i] = parseFloat((d.value * (1 + mapeRate)).toFixed(2));
        bandLower[i] = parseFloat((Math.max(0, d.value * (1 - mapeRate))).toFixed(2));
      }
    });

    // Band technique:
    //  - "Banda ±MAPE" (area, purple 20% opacity) fills 0 → upper bound
    //  - "bandLowerMask" (area, white 100% opacity) fills 0 → lower bound,
    //    visually "cutting" the bottom so only the stripe [lower, upper] is tinted.
    this.chartOptions = {
      series: [
        { name: 'Datos Reales',       type: 'line', data: groundTruthSeries },
        { name: 'Predicción (Test)',   type: 'line', data: testDataSeries    },
        { name: 'Predicción Futura',  type: 'line', data: predictionSeries  },
        { name: 'Banda ±MAPE',        type: 'area', data: bandUpper         },
        { name: ' ',                  type: 'area', data: bandLower         }
      ],
      chart: {
        height:     420,
        type:       'line',
        background: '#FFFFFF',
        zoom:       { enabled: true },
        toolbar:    { show: true },
        animations: { enabled: false }
      },
      colors: ['#3182CE', '#38A169', '#DD6B20', '#805AD5', '#FFFFFF'],
      fill: {
        type:    'solid',
        opacity: [1, 1, 1, 0.22, 1]
      },
      stroke: {
        width:     [2.5, 2,   2.5, 0, 0],
        curve:     'smooth',
        dashArray: [0,   6,   0,   0, 0]
      },
      markers: {
        size:        [5,   4,   4,   0, 0],
        strokeWidth: [2,   2,   2,   0, 0]
      },
      title: {
        text:  'Análisis de Predicciones del Producto',
        align: 'left',
        style: { fontSize: '16px', color: '#2d3748' }
      },
      subtitle: {
        text:  `UPC: ${this.upc}  |  MAPE: ${this.mape}%  |  R²: ${this.r2}`,
        align: 'left',
        style: { fontSize: '13px', color: '#718096' }
      },
      xaxis: {
        categories,
        labels: { rotate: -45, style: { fontSize: '11px' } },
        title:  { text: 'Semana' }
      },
      yaxis: {
        title:           { text: 'Unidades' },
        decimalsInFloat: 2,
        min:             0
      },
      legend: {
        position:        'top',
        horizontalAlign: 'right',
        // Only display 4 meaningful items; the white mask series (' ') is effectively hidden
        formatter: (seriesName: string) => seriesName.trim() === '' ? [] as any : seriesName
      },
      tooltip: {
        shared:    true,
        intersect: false,
        y: {
          formatter: (val: number | null, opts: any) => {
            if (val === null || val === undefined) return '';
            // Suppress tooltip for the white mask series
            if (opts?.seriesIndex === 4) return '';
            return Number(val).toFixed(2);
          }
        }
      },
      grid: {
        row: { colors: ['#f9fafb', 'transparent'], opacity: 0.5 }
      },
      annotations: {
        xaxis: [{
          x:               this.formatWeekLabel('202603'),
          borderColor:     '#a0aec0',
          strokeDashArray: 4,
          label: {
            text:  'Inicio predicción',
            style: { color: '#4a5568', fontSize: '11px' }
          }
        }]
      }
    };
  }
}
