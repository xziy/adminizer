# Фаза 10: Dashboard Widget - счётчик результатов фильтра

## Приоритет: P2
## Статус: ⏳ Не начата
## Зависимости: Фаза 1, 3, Система виджетов

> **💡 ПСЕВДОКОД:** Все примеры виджетов и React компонентов — **ПСЕВДОКОД в стиле JavaScript**. Адаптируйте под систему виджетов проекта.

---

## 📋 Описание

Создание виджета для дашборда, отображающего количество результатов фильтра с возможностью перехода:
- Счётчик с числом записей
- Динамическое обновление
- Сравнение с предыдущим периодом (тренд)
- Кликабельность для перехода к результатам
- Настройка стиля и цветовых индикаторов

---

## 🎯 Цели

1. ✅ Виджет счётчика (extends AbstractInfo)
2. ✅ Кэширование результатов
3. ✅ Показ трендов (рост/падение)
4. ✅ Настройка цветовых индикаторов
5. ✅ Обновление в реальном времени
6. ✅ Множественные фильтры в одном виджете

---

## ✅ Задачи

- [ ] 10.1 FilterCountWidget
- [ ] 10.2 FilterTrendWidget
- [ ] 10.3 FilterMultiCountWidget
- [ ] 10.4 Кэширование и обновление
- [ ] 10.5 React frontend components
- [ ] 10.6 Unit тесты (75%+ coverage)
  - [ ] 10.6.1 FilterCountWidget.getData()
  - [ ] 10.6.2 FilterTrendWidget.calculateTrend()
  - [ ] 10.6.3 Cache hit/miss logic
  - [ ] 10.6.4 Color indicator mapping
  - [ ] 10.6.5 Multiple filter aggregation
- [ ] 10.7 Integration тесты
  - [ ] 10.7.1 Widget registration in dashboard
  - [ ] 10.7.2 Real-time updates via WebSocket
  - [ ] 10.7.3 Cache invalidation on data change
  - [ ] 10.7.4 Navigation to filter results
- [ ] 10.8 Performance тесты
  - [ ] 10.8.1 Widget render < 100ms
  - [ ] 10.8.2 Cached query < 10ms
  - [ ] 10.8.3 Trend calculation < 50ms
- [ ] 10.9 E2E тесты
  - [ ] 10.9.1 Add widget to dashboard
  - [ ] 10.9.2 View count updates
  - [ ] 10.9.3 Click to navigate to results
  - [ ] 10.9.4 Configure colors and thresholds

---

## 📁 Структура файлов

```
src/
  lib/
    widgets/
      FilterCountWidget.ts          # Виджет счётчика
      FilterTrendWidget.ts          # Виджет с трендами
      FilterMultiCountWidget.ts     # Несколько фильтров
      
  assets/
    ui/
      widgets/
        FilterCountWidget.tsx       # Frontend компонент
        FilterTrendChart.tsx        # График тренда
        
  system/
    bindFilterWidgets.ts            # Регистрация виджетов
```

---

## 🔧 Реализация

### 1. Filter Count Widget (Backend)

**Файл:** `src/lib/widgets/FilterCountWidget.ts`

```typescript
import { abstractInfo } from './abstractInfo';
import { DataAccessor } from '../DataAccessor';

interface FilterCountWidgetConfig {
  filterId: string;              // UUID фильтра (строка!)
  label?: string;
  icon?: string;
  showTrend?: boolean;
  trendPeriod?: 'day' | 'week' | 'month';
  colorThresholds?: {
    green?: number;
    yellow?: number;
    red?: number;
  };
  refreshInterval?: number; // В секундах
}

export class FilterCountWidget extends abstractInfo {
  private dataAccessor: DataAccessor;
  
  constructor(dataAccessor: DataAccessor) {
    super();
    this.dataAccessor = dataAccessor;
  }
  
  /**
   * Получить данные виджета
   */
  async getData(req: any, config: FilterCountWidgetConfig) {
    const filter = await this.dataAccessor.findOne('FilterAP', {
      id: config.filterId
    });
    
    if (!filter) {
      return {
        error: 'Filter not found'
      };
    }
    
    // Получить текущее количество
    const count = await this.dataAccessor.count(
      filter.modelName,
      filter.criteria
    );
    
    // Определить цвет по порогам
    const color = this.getColorByThreshold(count, config.colorThresholds);
    
    let trend = null;
    if (config.showTrend) {
      trend = await this.calculateTrend(filter, count, config.trendPeriod);
    }
    
    return {
      label: config.label || filter.name,
      value: count,
      color,
      icon: config.icon || 'filter_alt',
      link: `/adminizer/filter/${filter.id}`,  // 🔗 Прямая ссылка на фильтр!
      trend,
      refreshInterval: config.refreshInterval || 60
    };
  }
  
  /**
   * Рендер виджета
   */
  async render(req: any, config: FilterCountWidgetConfig) {
    const data = await this.getData(req, config);
    
    return {
      type: 'filter-count',
      component: 'FilterCountWidget',
      props: data
    };
  }
  
  /**
   * Определить цвет по порогам
   */
  private getColorByThreshold(
    count: number,
    thresholds?: {
      green?: number;
      yellow?: number;
      red?: number;
    }
  ): string {
    if (!thresholds) {
      return 'blue';
    }
    
    if (thresholds.red !== undefined && count >= thresholds.red) {
      return 'red';
    }
    if (thresholds.yellow !== undefined && count >= thresholds.yellow) {
      return 'yellow';
    }
    if (thresholds.green !== undefined && count >= thresholds.green) {
      return 'green';
    }
    
    return 'gray';
  }
  
  /**
   * Вычислить тренд
   */
  private async calculateTrend(
    filter: any,
    currentCount: number,
    period: 'day' | 'week' | 'month' = 'day'
  ) {
    // Получить данные за предыдущий период
    const periodMs = this.getPeriodMs(period);
    const sinceDate = new Date(Date.now() - periodMs);
    
    // Модифицировать критерии для учёта даты
    const historicalCriteria = {
      ...filter.criteria,
      createdAt: { '<': sinceDate }
    };
    
    const previousCount = await this.dataAccessor.count(
      filter.modelName,
      historicalCriteria
    );
    
    const diff = currentCount - previousCount;
    const percentChange = previousCount > 0
      ? ((diff / previousCount) * 100).toFixed(1)
      : '0';
    
    return {
      diff,
      percentChange: parseFloat(percentChange),
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
      period
    };
  }
  
  /**
   * Получить длительность периода в миллисекундах
   */
  private getPeriodMs(period: 'day' | 'week' | 'month'): number {
    switch (period) {
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
    }
  }
}
```

---

### 2. Filter Trend Widget

**Файл:** `src/lib/widgets/FilterTrendWidget.ts`

```typescript
import { abstractInfo } from './abstractInfo';
import { DataAccessor } from '../DataAccessor';

interface FilterTrendWidgetConfig {
  filterId: string;
  label?: string;
  period: 'day' | 'week' | 'month';
  dataPoints?: number; // Количество точек на графике
}

export class FilterTrendWidget extends abstractInfo {
  private dataAccessor: DataAccessor;
  
  constructor(dataAccessor: DataAccessor) {
    super();
    this.dataAccessor = dataAccessor;
  }
  
  async getData(req: any, config: FilterTrendWidgetConfig) {
    const filter = await this.dataAccessor.findOne('FilterAP', {
      id: config.filterId
    });
    
    if (!filter) {
      return { error: 'Filter not found' };
    }
    
    const dataPoints = config.dataPoints || 7;
    const chartData = await this.getChartData(filter, config.period, dataPoints);
    
    return {
      label: config.label || filter.name,
      chartData,
      link: `/adminizer/filters/${filter.id}/results`,
      period: config.period
    };
  }
  
  async render(req: any, config: FilterTrendWidgetConfig) {
    const data = await this.getData(req, config);
    
    return {
      type: 'filter-trend',
      component: 'FilterTrendChart',
      props: data
    };
  }
  
  /**
   * Получить данные для графика
   */
  private async getChartData(
    filter: any,
    period: 'day' | 'week' | 'month',
    points: number
  ) {
    const periodMs = this.getPeriodMs(period);
    const data: { date: string; count: number }[] = [];
    
    for (let i = points - 1; i >= 0; i--) {
      const endDate = new Date(Date.now() - i * periodMs);
      const startDate = new Date(endDate.getTime() - periodMs);
      
      const criteria = {
        ...filter.criteria,
        createdAt: {
          '>=': startDate,
          '<': endDate
        }
      };
      
      const count = await this.dataAccessor.count(
        filter.modelName,
        criteria
      );
      
      data.push({
        date: endDate.toISOString().split('T')[0],
        count
      });
    }
    
    return data;
  }
  
  private getPeriodMs(period: 'day' | 'week' | 'month'): number {
    switch (period) {
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
    }
  }
}
```

---

### 3. Multi-Filter Widget

**Файл:** `src/lib/widgets/FilterMultiCountWidget.ts`

```typescript
import { abstractInfo } from './abstractInfo';
import { DataAccessor } from '../DataAccessor';

interface FilterMultiCountWidgetConfig {
  filters: Array<{
    filterId: string;
    label?: string;
    color?: string;
  }>;
  layout?: 'horizontal' | 'vertical' | 'grid';
  showTotals?: boolean;
}

export class FilterMultiCountWidget extends abstractInfo {
  private dataAccessor: DataAccessor;
  
  constructor(dataAccessor: DataAccessor) {
    super();
    this.dataAccessor = dataAccessor;
  }
  
  async getData(req: any, config: FilterMultiCountWidgetConfig) {
    const counts = await Promise.all(
      config.filters.map(async (filterConfig) => {
        const filter = await this.dataAccessor.findOne('FilterAP', {
          id: filterConfig.filterId
        });
        
        if (!filter) {
          return null;
        }
        
        const count = await this.dataAccessor.count(
          filter.modelName,
          filter.criteria
        );
        
        return {
          filterId: filter.id,
          label: filterConfig.label || filter.name,
          count,
          color: filterConfig.color || 'blue',
          link: `/adminizer/filters/${filter.id}/results`
        };
      })
    );
    
    const validCounts = counts.filter(c => c !== null);
    const total = config.showTotals
      ? validCounts.reduce((sum, c) => sum + (c?.count || 0), 0)
      : null;
    
    return {
      filters: validCounts,
      total,
      layout: config.layout || 'vertical'
    };
  }
  
  async render(req: any, config: FilterMultiCountWidgetConfig) {
    const data = await this.getData(req, config);
    
    return {
      type: 'filter-multi-count',
      component: 'FilterMultiCountWidget',
      props: data
    };
  }
}
```

---

## 🎨 Frontend Components

### Filter Count Widget

**Файл:** `src/assets/ui/widgets/FilterCountWidget.tsx`

```tsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface FilterCountWidgetProps {
  label: string;
  value: number;
  color: string;
  icon: string;
  link: string;
  trend?: {
    diff: number;
    percentChange: number;
    direction: 'up' | 'down' | 'same';
    period: string;
  };
  refreshInterval?: number;
}

export function FilterCountWidget({
  label,
  value,
  color,
  icon,
  link,
  trend,
  refreshInterval
}: FilterCountWidgetProps) {
  const [currentValue, setCurrentValue] = React.useState(value);
  
  React.useEffect(() => {
    if (!refreshInterval) return;
    
    const interval = setInterval(async () => {
      // Обновить данные
      const response = await fetch(`${link}/count`);
      const data = await response.json();
      setCurrentValue(data.count);
    }, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [refreshInterval, link]);
  
  const colorClasses = {
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200'
  };
  
  const trendIcon = trend?.direction === 'up'
    ? <TrendingUp size={16} />
    : trend?.direction === 'down'
    ? <TrendingDown size={16} />
    : <Minus size={16} />;
  
  const trendColor = trend?.direction === 'up'
    ? 'text-green-600'
    : trend?.direction === 'down'
    ? 'text-red-600'
    : 'text-gray-600';
  
  return (
    <Link href={link} className="filter-count-widget">
      <div className={`widget-card ${colorClasses[color] || colorClasses.blue}`}>
        <div className="widget-header">
          <span className="material-icons">{icon}</span>
          <span className="widget-label">{label}</span>
        </div>
        
        <div className="widget-value">
          {currentValue.toLocaleString()}
        </div>
        
        {trend && (
          <div className={`widget-trend ${trendColor}`}>
            {trendIcon}
            <span>{Math.abs(trend.percentChange)}%</span>
            <span className="trend-period">vs {trend.period}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
```

---

### Filter Trend Chart

**Файл:** `src/assets/ui/widgets/FilterTrendChart.tsx`

```tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from '@inertiajs/react';

interface FilterTrendChartProps {
  label: string;
  chartData: Array<{ date: string; count: number }>;
  link: string;
  period: string;
}

export function FilterTrendChart({
  label,
  chartData,
  link,
  period
}: FilterTrendChartProps) {
  return (
    <div className="filter-trend-widget">
      <div className="widget-header">
        <h3>{label}</h3>
        <Link href={link} className="view-link">
          View →
        </Link>
      </div>
      
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tickFormatter={(date) => new Date(date).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="widget-footer">
        Period: {period}
      </div>
    </div>
  );
}
```

---

### Multi-Count Widget

**Файл:** `src/assets/ui/widgets/FilterMultiCountWidget.tsx`

```tsx
import React from 'react';
import { Link } from '@inertiajs/react';

interface FilterItem {
  filterId: string;
  label: string;
  count: number;
  color: string;
  link: string;
}

interface FilterMultiCountWidgetProps {
  filters: FilterItem[];
  total?: number;
  layout: 'horizontal' | 'vertical' | 'grid';
}

export function FilterMultiCountWidget({
  filters,
  total,
  layout
}: FilterMultiCountWidgetProps) {
  const layoutClasses = {
    horizontal: 'flex flex-row gap-4',
    vertical: 'flex flex-col gap-2',
    grid: 'grid grid-cols-2 gap-4'
  };
  
  return (
    <div className="filter-multi-count-widget">
      <div className={layoutClasses[layout]}>
        {filters.map((filter) => (
          <Link
            key={filter.filterId}
            href={filter.link}
            className="filter-item"
          >
            <div className={`count-badge bg-${filter.color}-100 text-${filter.color}-700`}>
              {filter.count}
            </div>
            <div className="filter-label">{filter.label}</div>
          </Link>
        ))}
      </div>
      
      {total !== null && (
        <div className="total-count">
          Total: {total}
        </div>
      )}
    </div>
  );
}
```

---

## 📝 Регистрация виджетов

**Файл:** `src/system/bindFilterWidgets.ts`

```typescript
import { FilterCountWidget } from '../lib/widgets/FilterCountWidget';
import { FilterTrendWidget } from '../lib/widgets/FilterTrendWidget';
import { FilterMultiCountWidget } from '../lib/widgets/FilterMultiCountWidget';

export default function bindFilterWidgets(adminizer: any) {
  const dataAccessor = adminizer.getDataAccessor();
  
  // Регистрация виджетов
  adminizer.registerWidget('filter-count', new FilterCountWidget(dataAccessor));
  adminizer.registerWidget('filter-trend', new FilterTrendWidget(dataAccessor));
  adminizer.registerWidget('filter-multi-count', new FilterMultiCountWidget(dataAccessor));
  
  console.log('Filter widgets registered');
}
```

---

## 🎨 Стили

```scss
// filter-widgets.scss
.filter-count-widget {
  text-decoration: none;
  display: block;
  
  .widget-card {
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid;
    transition: all 0.2s;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  }
  
  .widget-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    
    .material-icons {
      font-size: 24px;
    }
    
    .widget-label {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  }
  
  .widget-value {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.5rem;
  }
  
  .widget-trend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    
    .trend-period {
      color: #6b7280;
      font-weight: 400;
    }
  }
}

.filter-trend-widget {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  
  .widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    
    h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }
    
    .view-link {
      color: #3b82f6;
      text-decoration: none;
      font-size: 0.875rem;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
  
  .chart-container {
    margin: 1rem 0;
  }
  
  .widget-footer {
    font-size: 0.875rem;
    color: #6b7280;
    text-align: center;
  }
}

.filter-multi-count-widget {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  
  .filter-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s;
    
    &:hover {
      background: #f3f4f6;
      transform: translateX(4px);
    }
    
    .count-badge {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-size: 1.25rem;
      font-weight: 700;
    }
    
    .filter-label {
      flex: 1;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }
  }
  
  .total-count {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    font-size: 1.25rem;
    font-weight: 600;
    text-align: center;
    color: #111827;
  }
}
```

---

## 📝 Пример использования

```typescript
// В конфигурации дашборда
export default {
  widgets: [
    {
      type: 'filter-count',
      config: {
        filterId: 'active-users-filter',
        label: 'Active Users',
        icon: 'people',
        showTrend: true,
        trendPeriod: 'week',
        colorThresholds: {
          green: 100,
          yellow: 50,
          red: 0
        },
        refreshInterval: 60
      },
      position: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      type: 'filter-trend',
      config: {
        filterId: 'new-orders-filter',
        label: 'New Orders',
        period: 'day',
        dataPoints: 14
      },
      position: { x: 3, y: 0, w: 6, h: 3 }
    },
    {
      type: 'filter-multi-count',
      config: {
        filters: [
          { filterId: 'pending-filter', label: 'Pending', color: 'yellow' },
          { filterId: 'approved-filter', label: 'Approved', color: 'green' },
          { filterId: 'rejected-filter', label: 'Rejected', color: 'red' }
        ],
        layout: 'horizontal',
        showTotals: true
      },
      position: { x: 9, y: 0, w: 3, h: 2 }
    }
  ]
};
```

---

## ✅ Чеклист готовности

- [ ] FilterCountWidget backend
- [ ] FilterTrendWidget backend
- [ ] FilterMultiCountWidget backend
- [ ] Frontend компоненты всех виджетов
- [ ] Кэширование данных
- [ ] Auto-refresh функционал
- [ ] Цветовые индикаторы
- [ ] Тренды и сравнения
- [ ] Регистрация в системе виджетов
- [ ] Тесты
- [ ] Документация

---

## 🚀 Следующие шаги

После завершения:
1. ✅ Добавить анимации для обновлений
2. ✅ WebSocket для real-time обновлений
3. ✅ Экспорт конфигураций виджетов
