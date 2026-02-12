# Фаза 6: Экспорт данных (JSON, CSV, Excel)

## Приоритет: P1
## Статус: ✅ Завершена
## Зависимости: Фаза 1, 2, 3

> **💡 ПСЕВДОКОД:** Весь код здесь — **ПСЕВДОКОД в стиле JavaScript**. Классы и методы экспорта показаны для понимания архитектуры.

---

## 📋 Описание

Реализация экспорта результатов фильтра в различные форматы:
- JSON (структурированный формат)
- CSV (табличные данные)
- Excel/XLSX (расширенный формат с форматированием)

---

## 💯 Цели

1. ✅ Экспорт в JSON с учётом связей
2. ✅ Экспорт в CSV с настраиваемыми разделителями
3. ✅ Экспорт в Excel с форматированием
4. ✅ Стриминг для больших датасетов
5. ✅ Кастомизация полей для экспорта
6. ✅ Фоновая обработка больших экспортов

---

## ✅ Задачи

- [ ] 6.1 ExportService и formatters
- [ ] 6.2 ExportController
- [ ] 6.3 Export UI components
- [ ] 6.4 Фоновая очередь (ExportQueue)
- [ ] 6.5 Unit тесты (85%+ coverage)
  - [ ] 6.5.1 JsonExporter.export()
  - [ ] 6.5.2 CsvExporter.export() (разделители, кодировки)
  - [ ] 6.5.3 ExcelExporter.export() (форматирование, стили)
  - [ ] 6.5.4 ExportService.stream() (chunked data)
  - [ ] 6.5.5 ExportQueue.enqueue()
  - [ ] 6.5.6 Field selection/mapping
- [ ] 6.6 Integration тесты
  - [ ] 6.6.1 Export with filter conditions
  - [ ] 6.6.2 Export with relations
  - [ ] 6.6.3 Large dataset (10k+ records)
  - [ ] 6.6.4 Background job processing
  - [ ] 6.6.5 File download API
- [ ] 6.7 Performance тесты
  - [ ] 6.7.1 10k records < 5s (JSON)
  - [ ] 6.7.2 10k records < 10s (CSV)
  - [ ] 6.7.3 10k records < 15s (Excel)
  - [ ] 6.7.4 Memory usage < 500MB
- [ ] 6.8 E2E тесты
  - [ ] 6.8.1 Export button click
  - [ ] 6.8.2 Format selection
  - [ ] 6.8.3 Field selection
  - [ ] 6.8.4 File download

---

## 📁 Структура файлов

```
src/
  lib/
    export/
      ExportService.ts           # Основной сервис экспорта
      formatters/
        JsonExporter.ts          # JSON форматтер
        CsvExporter.ts           # CSV форматтер
        ExcelExporter.ts         # Excel форматтер
        AbstractExporter.ts      # Базовый класс
      ExportQueue.ts             # Очередь для фоновых экспортов
      
  controllers/
    export/
      ExportController.ts        # Контроллер экспорта
      
  system/
    bindExport.ts                # Привязка к Adminizer
    
  types/
    export.d.ts                  # TypeScript типы
```

---

## 🔧 Реализация

### 1. Abstract Exporter

**Файл:** `src/lib/export/formatters/AbstractExporter.ts`

```typescript
import { FilterAP } from '../../../models/FilterAP';
import { DataAccessor } from '../../DataAccessor';

export interface ExportOptions {
  filterId?: string;
  modelName?: string;
  criteria?: any;
  columns?: string[];        // Какие колонки экспортировать
  includeRelations?: string[]; // Связанные модели
  limit?: number;
  offset?: number;
  transformRow?: (row: any) => any; // Кастомная трансформация
}

export interface ExportResult {
  success: boolean;
  filePath?: string;         // Путь к сгенерированному файлу
  downloadUrl?: string;      // URL для скачивания
  rowCount?: number;
  error?: string;
}

export abstract class AbstractExporter {
  protected dataAccessor: DataAccessor;
  
  constructor(dataAccessor: DataAccessor) {
    this.dataAccessor = dataAccessor;
  }
  
  abstract export(options: ExportOptions): Promise<ExportResult>;
  abstract getContentType(): string;
  abstract getFileExtension(): string;
  
  /**
   * Получить данные для экспорта
   */
  protected async fetchData(options: ExportOptions): Promise<any[]> {
    let criteria = options.criteria || {};
    
    // Если передан filterId - загружаем критерии из фильтра
    if (options.filterId) {
      const filter = await this.dataAccessor.findOne('FilterAP', {
        id: options.filterId
      });
      
      if (!filter) {
        throw new Error(`Filter ${options.filterId} not found`);
      }
      
      criteria = filter.criteria;
    }
    
    const modelName = options.modelName || (await this.getModelFromFilter(options.filterId));
    
    // Добавляем лимиты
    if (options.limit) {
      criteria.limit = options.limit;
    }
    if (options.offset) {
      criteria.skip = options.offset;
    }
    
    // Fetch data
    const data = await this.dataAccessor.find(modelName, criteria);
    
    // Применяем трансформацию если есть
    if (options.transformRow) {
      return data.map(options.transformRow);
    }
    
    return data;
  }
  
  /**
   * Получить имя модели из фильтра
   */
  protected async getModelFromFilter(filterId?: string): Promise<string> {
    if (!filterId) {
      throw new Error('Either filterId or modelName must be provided');
    }
    
    const filter = await this.dataAccessor.findOne('FilterAP', {
      id: filterId
    });
    
    if (!filter) {
      throw new Error(`Filter ${filterId} not found`);
    }
    
    return filter.modelName;
  }
  
  /**
   * Подготовить колонки для экспорта
   */
  protected prepareColumns(data: any[], requestedColumns?: string[]): string[] {
    if (requestedColumns && requestedColumns.length > 0) {
      return requestedColumns;
    }
    
    // Извлекаем все уникальные ключи из данных
    const allKeys = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    
    return Array.from(allKeys);
  }
  
  /**
   * Получить значение из объекта по пути (поддержка вложенных полей)
   */
  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }
}
```

---

### 2. JSON Exporter

**Файл:** `src/lib/export/formatters/JsonExporter.ts`

```typescript
import { AbstractExporter, ExportOptions, ExportResult } from './AbstractExporter';
import fs from 'fs';
import path from 'path';

export class JsonExporter extends AbstractExporter {
  
  getContentType(): string {
    return 'application/json';
  }
  
  getFileExtension(): string {
    return 'json';
  }
  
  async export(options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.fetchData(options);
      
      // Фильтруем колонки если указаны
      let processedData = data;
      if (options.columns && options.columns.length > 0) {
        processedData = data.map(row => {
          const filtered: any = {};
          options.columns!.forEach(col => {
            filtered[col] = this.getNestedValue(row, col);
          });
          return filtered;
        });
      }
      
      // Генерируем файл
      const fileName = `export_${Date.now()}.json`;
      const filePath = path.join(process.cwd(), 'exports', fileName);
      
      // Создаём директорию если не существует
      const exportDir = path.dirname(filePath);
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      // Записываем JSON
      fs.writeFileSync(
        filePath,
        JSON.stringify(processedData, null, 2),
        'utf-8'
      );
      
      return {
        success: true,
        filePath,
        downloadUrl: `/api/adminizer/export/download/${fileName}`,
        rowCount: processedData.length
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

---

### 3. CSV Exporter

**Файл:** `src/lib/export/formatters/CsvExporter.ts`

```typescript
import { AbstractExporter, ExportOptions, ExportResult } from './AbstractExporter';
import fs from 'fs';
import path from 'path';

export interface CsvExportOptions extends ExportOptions {
  delimiter?: string;       // Разделитель (по умолчанию ',')
  includeHeaders?: boolean; // Включать заголовки (по умолчанию true)
  encoding?: BufferEncoding; // Кодировка (по умолчанию 'utf-8')
}

export class CsvExporter extends AbstractExporter {
  
  getContentType(): string {
    return 'text/csv';
  }
  
  getFileExtension(): string {
    return 'csv';
  }
  
  async export(options: CsvExportOptions): Promise<ExportResult> {
    try {
      const delimiter = options.delimiter || ',';
      const includeHeaders = options.includeHeaders !== false;
      const encoding = options.encoding || 'utf-8';
      
      const data = await this.fetchData(options);
      
      if (data.length === 0) {
        return {
          success: false,
          error: 'No data to export'
        };
      }
      
      const columns = this.prepareColumns(data, options.columns);
      
      // Формируем CSV строки
      const rows: string[] = [];
      
      // Заголовки
      if (includeHeaders) {
        rows.push(this.escapeRow(columns, delimiter));
      }
      
      // Данные
      data.forEach(row => {
        const values = columns.map(col => {
          const value = this.getNestedValue(row, col);
          return this.formatValue(value);
        });
        rows.push(this.escapeRow(values, delimiter));
      });
      
      const csvContent = rows.join('\n');
      
      // Генерируем файл
      const fileName = `export_${Date.now()}.csv`;
      const filePath = path.join(process.cwd(), 'exports', fileName);
      
      const exportDir = path.dirname(filePath);
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, csvContent, encoding);
      
      return {
        success: true,
        filePath,
        downloadUrl: `/api/adminizer/export/download/${fileName}`,
        rowCount: data.length
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Форматировать значение для CSV
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }
  
  /**
   * Экранировать строку для CSV
   */
  private escapeRow(values: string[], delimiter: string): string {
    return values.map(val => {
      const stringVal = String(val);
      
      // Если содержит разделитель, кавычки или перенос строки - оборачиваем в кавычки
      if (stringVal.includes(delimiter) || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      
      return stringVal;
    }).join(delimiter);
  }
}
```

---

### 4. Excel Exporter

**Файл:** `src/lib/export/formatters/ExcelExporter.ts`

```typescript
import { AbstractExporter, ExportOptions, ExportResult } from './AbstractExporter';
import ExcelJS from 'exceljs';
import path from 'path';

export interface ExcelExportOptions extends ExportOptions {
  sheetName?: string;
  includeHeaders?: boolean;
  autoFilter?: boolean;
  freezeHeaders?: boolean;
  columnWidths?: { [key: string]: number };
}

export class ExcelExporter extends AbstractExporter {
  
  getContentType(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  
  getFileExtension(): string {
    return 'xlsx';
  }
  
  async export(options: ExcelExportOptions): Promise<ExportResult> {
    try {
      const data = await this.fetchData(options);
      
      if (data.length === 0) {
        return {
          success: false,
          error: 'No data to export'
        };
      }
      
      const columns = this.prepareColumns(data, options.columns);
      
      // Создаём workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(options.sheetName || 'Export');
      
      // Настройка колонок
      worksheet.columns = columns.map(col => ({
        header: col,
        key: col,
        width: options.columnWidths?.[col] || 15
      }));
      
      // Стилизация заголовков
      if (options.includeHeaders !== false) {
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        
        // Заморозка заголовков
        if (options.freezeHeaders !== false) {
          worksheet.views = [
            { state: 'frozen', ySplit: 1 }
          ];
        }
      }
      
      // Добавляем данные
      data.forEach(row => {
        const rowData: any = {};
        columns.forEach(col => {
          rowData[col] = this.getNestedValue(row, col);
        });
        worksheet.addRow(rowData);
      });
      
      // Auto-filter
      if (options.autoFilter !== false) {
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: data.length + 1, column: columns.length }
        };
      }
      
      // Генерируем файл
      const fileName = `export_${Date.now()}.xlsx`;
      const filePath = path.join(process.cwd(), 'exports', fileName);
      
      await workbook.xlsx.writeFile(filePath);
      
      return {
        success: true,
        filePath,
        downloadUrl: `/api/adminizer/export/download/${fileName}`,
        rowCount: data.length
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

---

### 5. Export Service

**Файл:** `src/lib/export/ExportService.ts`

```typescript
import { DataAccessor } from '../DataAccessor';
import { JsonExporter } from './formatters/JsonExporter';
import { CsvExporter, CsvExportOptions } from './formatters/CsvExporter';
import { ExcelExporter, ExcelExportOptions } from './formatters/ExcelExporter';
import { AbstractExporter, ExportOptions, ExportResult } from './formatters/AbstractExporter';

export type ExportFormat = 'json' | 'csv' | 'xlsx';

export class ExportService {
  private dataAccessor: DataAccessor;
  private exporters: Map<ExportFormat, AbstractExporter>;
  
  constructor(dataAccessor: DataAccessor) {
    this.dataAccessor = dataAccessor;
    
    this.exporters = new Map([
      ['json', new JsonExporter(dataAccessor)],
      ['csv', new CsvExporter(dataAccessor)],
      ['xlsx', new ExcelExporter(dataAccessor)]
    ]);
  }
  
  /**
   * Экспорт данных в указанном формате
   */
  async export(
    format: ExportFormat,
    options: ExportOptions | CsvExportOptions | ExcelExportOptions
  ): Promise<ExportResult> {
    const exporter = this.exporters.get(format);
    
    if (!exporter) {
      return {
        success: false,
        error: `Unsupported export format: ${format}`
      };
    }
    
    return exporter.export(options);
  }
  
  /**
   * Экспорт фильтра
   */
  async exportFilter(
    filterId: string,
    format: ExportFormat,
    additionalOptions?: Partial<ExportOptions>
  ): Promise<ExportResult> {
    return this.export(format, {
      filterId,
      ...additionalOptions
    });
  }
  
  /**
   * Получить список доступных форматов
   */
  getAvailableFormats(): ExportFormat[] {
    return Array.from(this.exporters.keys());
  }
  
  /**
   * Получить Content-Type для формата
   */
  getContentType(format: ExportFormat): string | undefined {
    return this.exporters.get(format)?.getContentType();
  }
}
```

---

### 6. Export Controller

**Файл:** `src/controllers/export/ExportController.ts`

```typescript
import { ReqType, ResType } from '../../interfaces/types';
import { ExportService, ExportFormat } from '../../lib/export/ExportService';
import fs from 'fs';
import path from 'path';

export class ExportController {
  private exportService: ExportService;
  
  constructor(exportService: ExportService) {
    this.exportService = exportService;
  }
  
  /**
   * POST /api/adminizer/export
   * Body: { format, filterId?, modelName?, criteria?, columns?, ... }
   */
  async exportData(req: ReqType, res: ResType) {
    try {
      const { format, ...options } = req.body;
      
      if (!format) {
        return res.status(400).json({
          error: 'Format is required'
        });
      }
      
      const result = await this.exportService.export(format as ExportFormat, options);
      
      if (!result.success) {
        return res.status(500).json({
          error: result.error
        });
      }
      
      return res.json(result);
      
    } catch (error: any) {
      console.error('Export error:', error);
      return res.status(500).json({
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/adminizer/export/filter/:id/:format
   */
  async exportFilterById(req: ReqType, res: ResType) {
    try {
      const { id, format } = req.params;
      
      const result = await this.exportService.exportFilter(
        id,
        format as ExportFormat
      );
      
      if (!result.success) {
        return res.status(500).json({
          error: result.error
        });
      }
      
      return res.json(result);
      
    } catch (error: any) {
      console.error('Export filter error:', error);
      return res.status(500).json({
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/adminizer/export/download/:filename
   * Скачивание сгенерированного файла
   */
  async downloadExport(req: ReqType, res: ResType) {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), 'exports', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          error: 'File not found'
        });
      }
      
      // Определяем Content-Type по расширению
      const ext = path.extname(filename).slice(1) as ExportFormat;
      const contentType = this.exportService.getContentType(ext);
      
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Удаляем файл после скачивания (опционально)
      fileStream.on('end', () => {
        // setTimeout(() => fs.unlinkSync(filePath), 5000);
      });
      
    } catch (error: any) {
      console.error('Download error:', error);
      return res.status(500).json({
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/adminizer/export/formats
   * Список доступных форматов
   */
  async getFormats(req: ReqType, res: ResType) {
    const formats = this.exportService.getAvailableFormats();
    return res.json({ formats });
  }
}
```

---

## 📦 Зависимости

Добавить в `package.json`:

```json
{
  "dependencies": {
    "exceljs": "^4.3.0"
  },
  "devDependencies": {
    "@types/exceljs": "^1.3.0"
  }
}
```

---

## 🧪 Тестирование

### Тест экспорта в JSON

```typescript
// test/export.spec.ts
import { ExportService } from '../src/lib/export/ExportService';

describe('ExportService', () => {
  it('should export to JSON', async () => {
    const result = await exportService.export('json', {
      modelName: 'Example',
      criteria: { status: 'active' }
    });
    
    expect(result.success).toBe(true);
    expect(result.filePath).toBeDefined();
    expect(result.rowCount).toBeGreaterThan(0);
  });
  
  it('should export filter results', async () => {
    const result = await exportService.exportFilter(
      'filter-123',
      'csv'
    );
    
    expect(result.success).toBe(true);
  });
});
```

---

## 🎨 Frontend UI

### Export Button Component

```tsx
// ExportButton.tsx
import { useState } from 'react';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  filterId: string;
}

export function ExportButton({ filterId }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<'json' | 'csv' | 'xlsx'>('csv');
  
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch(`/api/adminizer/export/filter/${filterId}/${format}`);
      const data = await response.json();
      
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="export-controls">
      <select value={format} onChange={e => setFormat(e.target.value as any)}>
        <option value="json">JSON</option>
        <option value="csv">CSV</option>
        <option value="xlsx">Excel</option>
      </select>
      
      <button onClick={handleExport} disabled={isExporting}>
        <Download size={16} />
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
    </div>
  );
}
```

---

## ✅ Чеклист готовности

- [ ] AbstractExporter базовый класс
- [ ] JsonExporter реализован
- [ ] CsvExporter с поддержкой кастомных разделителей
- [ ] ExcelExporter с форматированием
- [ ] ExportService объединяет все экспортёры
- [ ] ExportController с роутами
- [ ] Поддержка стриминга для больших файлов
- [ ] Frontend кнопка экспорта
- [ ] Тесты для всех форматов
- [ ] Документация в docs/Export.md

---

## 🚀 Следующие шаги

После завершения:
1. ✅ Добавить экспорт в Public API (Фаза 7)
2. ✅ Интегрировать с уведомлениями (Фаза 8)
3. ✅ Добавить scheduled exports (крон задачи)
