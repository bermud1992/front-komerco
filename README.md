# IA Kommerco × Walmart
### Plataforma de Gestión de Inventario — Sprint 1

Aplicación Angular para el monitoreo operativo de inventario Kommerco × Walmart. Implementa semáforo DOH (Días On Hand), seguimiento de InStock %, Top 10 artículos críticos y análisis predictivo de demanda.

---

## Requisitos previos

Antes de clonar o copiar el proyecto, asegúrate de tener instalado lo siguiente en el nuevo equipo:

| Herramienta | Versión recomendada | Descarga |
|---|---|---|
| **Node.js** | 18.x LTS | https://nodejs.org |
| **npm** | 10.x (incluido con Node) | — |
| **Angular CLI** | 16.x | `npm install -g @angular/cli@16` |

> **Verifica tu instalación:**
> ```bash
> node --version    # debe mostrar v18.x.x
> npm --version     # debe mostrar 10.x.x
> ng version        # debe mostrar Angular CLI: 16.x.x
> ```

---

## Instalación en un nuevo equipo

### 1. Clonar o copiar el proyecto

**Con Git:**
```bash
git clone <url-del-repositorio>
cd stationery-predictive-analytics
```

**Sin Git (copia manual):**
Copia la carpeta del proyecto al nuevo equipo y abre una terminal en su raíz.

> **Importante:** No copies la carpeta `node_modules` — es muy pesada y se regenera en el paso 2.

---

### 2. Instalar dependencias

Desde la raíz del proyecto ejecuta:

```bash
npm install
```

Esto descarga automáticamente todos los paquetes definidos en `package.json`:
- Angular 16 + Angular Material 16
- ApexCharts / ng-apexcharts (gráficas interactivas)
- RxJS, TypeScript

---

### 3. Correr el servidor de desarrollo

```bash
npm start
```

o equivalente:

```bash
ng serve
```

La aplicación estará disponible en:

```
http://localhost:4200
```

El servidor recarga automáticamente al guardar cambios.

---

## Credenciales de acceso (demo)

| Campo | Valor |
|---|---|
| Usuario | `admin` |
| Contraseña | `admin123` |

---

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo en `localhost:4200` |
| `npm run build` | Compilar para producción en `/dist` |
| `npm run watch` | Compilar en modo watch (desarrollo continuo) |
| `npm test` | Ejecutar pruebas unitarias con Karma |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── components/
│   │   ├── dashboard/          # Vista principal (Operativo, Inventario, CSV, Predicción)
│   │   ├── header/             # Barra superior con navegación por tabs
│   │   ├── sidebar/            # Panel lateral izquierdo (colapsable)
│   │   ├── charts/             # Gráfica predictiva con banda ±MAPE
│   │   ├── csv-viewer/         # Visualizador de catálogo CSV
│   │   ├── product-card/       # Tarjeta de detalle de producto
│   │   ├── login/              # Pantalla de autenticación
│   │   └── dialogs/            # Diálogos modales
│   ├── services/
│   │   ├── data.service.ts     # Datos mock + lógica DOH/InStock semáforo
│   │   ├── navigation.service.ts # Control centralizado de navegación
│   │   └── auth.service.ts     # Autenticación
│   └── models/
│       └── product.model.ts    # Interfaces Product, ChartData
└── styles.scss                 # Tema global Material + brand Kommerco × Walmart
```

---

## Vistas de la aplicación

La navegación se controla desde los tabs del header:

| Tab | Vista | Descripción |
|---|---|---|
| **Operativo** | Dashboard KPI | Semáforo DOH (E01), InStock % global (E02), Top 10 críticos (E03) |
| **Inventario** | Tabla de productos | Catálogo completo con filtros y acceso a predicción |
| **Catálogo CSV** | Cargador de datos | Importación desde Retail Link — requiere cargar un archivo CSV primero |
| **Análisis Predictivo** | Gráfica predictiva | Proyección de demanda 16 semanas con banda de error ±MAPE |

---

## Reglas de semáforo DOH

Criterio definido por Javier Pérez — Objetivo Walmart: **70 días**.

| Color | Rango DOH | Significado |
|---|---|---|
| ROJO | < 50 días | Desabasto inminente — requiere acción urgente |
| NARANJA | 50 – 59 días | Por debajo del objetivo |
| AMARILLO | 60 – 70 días | En rango, monitorear |
| VERDE | > 70 días | Cobertura óptima |

**Objetivo contractual InStock %:** 97%

---

## Solución de problemas frecuentes

**`ng: command not found`**
```bash
npm install -g @angular/cli@16
```

**Error de versión de Node — se requiere Node 18**
```bash
# Con nvm (recomendado)
nvm install 18
nvm use 18

# O descarga el instalador desde:
# https://nodejs.org/en/download
```

**Puerto 4200 ocupado**
```bash
ng serve --port 4300
```

**Error en `npm install` (permisos en Linux/Mac)**
```bash
# Opción 1 — usar sudo
sudo npm install

# Opción 2 — corregir permisos de npm (recomendado)
# https://docs.npmjs.com/resolving-eacces-permissions-errors
```

**La app no carga después de `npm start`**
- Verifica que Node sea v18 con `node --version`
- Borra la carpeta `node_modules` y vuelve a correr `npm install`
- Asegúrate de estar en la carpeta raíz del proyecto (donde está `package.json`)

---

## Tecnologías utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| Angular | 16.2 | Framework principal |
| Angular Material | 16.2 | Componentes UI (tablas, forms, toolbar) |
| ApexCharts / ng-apexcharts | 3.41 / 1.8 | Gráficas interactivas (barras, líneas, área) |
| RxJS | 7.8 | Programación reactiva y servicios |
| TypeScript | 5.1 | Tipado estático |

---

*IA Kommerco × Walmart — Plataforma de Gestión de Inventario*
