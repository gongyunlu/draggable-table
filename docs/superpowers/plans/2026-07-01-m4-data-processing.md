# M4: 数据处理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 排序（单列 + 多列）+ 筛选（enum/text/custom）+ server 模式 + 无限滚动。

**Architecture:** useTable 扩展 sort/filter state（借 core 的 sortState/filterState reducer）。Header 里加排序 icon + FilterPopover。Server 模式通过 useServerData hook 管理请求，requestId 保护并发。无限滚动在 VirtualBody 里监听 scroll 靠近底部时调 onLoadMore。

**Tech Stack:** React 19 useTransition, core 状态引擎

**Spec reference:** [`../specs/2026-07-01-draggable-table-design.md`](../specs/2026-07-01-draggable-table-design.md) §10-13, §19 M4

---

## File Structure

```
packages/table/src/
├── hooks/
│   ├── useTable.ts             （扩展 sort/filter）
│   ├── useServerData.ts        （新增）
│   └── useInfiniteScroll.ts    （新增）
├── components/
│   ├── Header/
│   │   ├── HeaderCell.tsx      （加排序 icon + 筛选触发）
│   │   ├── FilterPopover.tsx   （新增）
│   │   ├── SortIcon.tsx        （新增）
│   │   └── FilterEnum.tsx      / FilterText.tsx
│   └── icons/
│       ├── ArrowUp.tsx
│       └── ArrowDown.tsx

apps/playground/src/examples/
├── 08-server-side.tsx
└── 09-infinite-scroll.tsx
```

---

## Task 1: SortIcon + Header 排序 UI

**Files:**
- Create: `packages/table/src/components/icons/ArrowUp.tsx`
- Create: `packages/table/src/components/icons/ArrowDown.tsx`
- Create: `packages/table/src/components/Header/SortIcon.tsx`
- Modify: `packages/table/src/components/Header/HeaderCell.tsx`

- [ ] **Step 1: icons**

`packages/table/src/components/icons/ArrowUp.tsx`:

```tsx
import type { SVGProps } from 'react'
export function ArrowUp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden {...props}>
      <path d="M6 9V3M3 6l3-3 3 3" />
    </svg>
  )
}
```

`packages/table/src/components/icons/ArrowDown.tsx`:

```tsx
import type { SVGProps } from 'react'
export function ArrowDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden {...props}>
      <path d="M6 3v6M3 6l3 3 3-3" />
    </svg>
  )
}
```

- [ ] **Step 2: SortIcon**

`packages/table/src/components/Header/SortIcon.tsx`:

```tsx
import type { SortDirection } from '@draggable-table/core'
import { ArrowUp } from '../icons/ArrowUp.js'
import { ArrowDown } from '../icons/ArrowDown.js'

export interface SortIconProps {
  direction: SortDirection | null
}

export function SortIcon({ direction }: SortIconProps) {
  return (
    <span className={`dt-sort-icon dt-sort-icon--${direction ?? 'none'}`}>
      <ArrowUp
        style={{ opacity: direction === 'asc' ? 1 : 0.3, display: 'block' }}
      />
      <ArrowDown
        style={{ opacity: direction === 'desc' ? 1 : 0.3, display: 'block', marginTop: -4 }}
      />
    </span>
  )
}
```

- [ ] **Step 3: 修改 HeaderCell 显示排序 icon**

替换 `packages/table/src/components/Header/HeaderCell.tsx`:

```tsx
import type { ResolvedColumn, SortDirection } from '@draggable-table/core'
import type { ReactNode } from 'react'
import { SortIcon } from './SortIcon.js'

export interface HeaderCellProps<T> {
  column: ResolvedColumn<T>
  width?: number
  sortDirection?: SortDirection | null
  onToggleSort?: (columnKey: string, event: React.MouseEvent) => void
  filterActive?: boolean
  onOpenFilter?: (columnKey: string, anchor: HTMLElement) => void
}

export function HeaderCell<T>({
  column,
  width,
  sortDirection = null,
  onToggleSort,
  filterActive,
  onOpenFilter,
}: HeaderCellProps<T>) {
  const rendered: ReactNode =
    typeof column.title === 'function'
      ? (column.title as () => ReactNode)()
      : ((column.title ?? column.key) as ReactNode)

  const clickable = column.sortable && onToggleSort

  return (
    <div
      className="dt-header-cell"
      role="columnheader"
      style={{ width: width ?? column.computedWidth, cursor: clickable ? 'pointer' : undefined }}
      aria-label={column.ariaLabel ?? String(column.key)}
      aria-sort={
        sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'
      }
      onClick={(e) => {
        if (clickable) onToggleSort(column.key, e)
      }}
    >
      <div className="dt-header-cell__content">{rendered}</div>
      {column.sortable && <SortIcon direction={sortDirection} />}
      {column.filter && (
        <button
          type="button"
          className={`dt-header-cell__filter${filterActive ? ' dt-header-cell__filter--active' : ''}`}
          aria-label={`Filter ${String(column.key)}`}
          onClick={(e) => {
            e.stopPropagation()
            onOpenFilter?.(column.key, e.currentTarget)
          }}
        >
          ⚗
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 提交**

```bash
git add packages/table/src/components/icons/ArrowUp.tsx packages/table/src/components/icons/ArrowDown.tsx packages/table/src/components/Header/SortIcon.tsx packages/table/src/components/Header/HeaderCell.tsx
git commit -m "feat(table): sort icon and filter trigger in header cell"
```

---

## Task 2: useTable 扩展 sort/filter

**Files:**
- Modify: `packages/table/src/hooks/useTable.ts`
- Create: `packages/table/tests/hooks/useTable-sort.test.tsx`

- [ ] **Step 1: 测试**

```tsx
import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTable } from '../../src/hooks/useTable.js'

interface Row {
  id: string
  age: number
}

const data: Row[] = [
  { id: 'a', age: 30 },
  { id: 'b', age: 20 },
  { id: 'c', age: 40 },
]

describe('useTable sort', () => {
  it('toggleSort cycles asc → desc → none', () => {
    const { result } = renderHook(() =>
      useTable<Row>({
        data,
        rowKey: 'id',
        columns: [{ key: 'age', field: 'age', sortable: true }],
      }),
    )
    expect(result.current.visibleRows.map((r) => r.key)).toEqual(['a', 'b', 'c'])
    act(() => result.current.actions.toggleSort('age'))
    expect(result.current.visibleRows.map((r) => r.key)).toEqual(['b', 'a', 'c'])
    act(() => result.current.actions.toggleSort('age'))
    expect(result.current.visibleRows.map((r) => r.key)).toEqual(['c', 'a', 'b'])
    act(() => result.current.actions.toggleSort('age'))
    expect(result.current.visibleRows.map((r) => r.key)).toEqual(['a', 'b', 'c'])
  })

  it('setFilter narrows visibleRows', () => {
    const { result } = renderHook(() =>
      useTable<Row>({
        data,
        rowKey: 'id',
        columns: [{ key: 'id', field: 'id', filter: { type: 'text' } }],
      }),
    )
    act(() =>
      result.current.actions.setFilter('id', {
        type: 'text',
        value: 'a',
        predicate: 'contains',
      }),
    )
    expect(result.current.visibleRows.map((r) => r.key)).toEqual(['a'])
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @draggable-table/table test tests/hooks/useTable-sort.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 扩展 useTable**

替换 `packages/table/src/hooks/useTable.ts`:

```ts
import { useMemo, useTransition } from 'react'
import {
  DataModel,
  computeVisibleRows,
  expandToDepth,
  resolveColumns,
  toggleExpand as toggleExpandSet,
  toggleSort as toggleSortReducer,
  setFilter as setFilterReducer,
  clearFilter as clearFilterReducer,
  type ColumnDef,
  type DataSource,
  type FilterState,
  type FilterValue,
  type RowKey,
  type SortState,
} from '@draggable-table/core'
import { useControllable } from './useControllable.js'

export interface UseTableOptions<T> {
  data: DataSource<T>['data']
  rowKey: DataSource<T>['rowKey']
  tree?: DataSource<T>['tree']
  columns: ColumnDef<T>[]

  expandedKeys?: RowKey[]
  defaultExpandedKeys?: RowKey[]
  defaultExpandedDepth?: number | 'all'
  onExpand?: (keys: RowKey[]) => void

  sort?: SortState[]
  defaultSort?: SortState[]
  onSortChange?: (state: SortState[]) => void

  filter?: FilterState
  defaultFilter?: FilterState
  onFilterChange?: (state: FilterState) => void

  totalWidth?: number
  serverMode?: boolean
}

export function useTable<T>(options: UseTableOptions<T>) {
  const {
    data,
    rowKey,
    tree,
    columns,
    expandedKeys,
    defaultExpandedKeys,
    defaultExpandedDepth,
    onExpand,
    sort,
    defaultSort,
    onSortChange,
    filter,
    defaultFilter,
    onFilterChange,
    totalWidth = 800,
    serverMode = false,
  } = options

  const [, startTransition] = useTransition()

  const model = useMemo(
    () => DataModel.from<T>({ data, rowKey, ...(tree ? { tree } : {}) }),
    [data, rowKey, tree],
  )

  const initialExpanded = useMemo<RowKey[]>(() => {
    if (defaultExpandedKeys) return defaultExpandedKeys
    if (defaultExpandedDepth !== undefined)
      return Array.from(expandToDepth(model, defaultExpandedDepth))
    return []
  }, [model, defaultExpandedKeys, defaultExpandedDepth])

  const [expandedList, setExpandedList] = useControllable<RowKey[]>({
    value: expandedKeys,
    defaultValue: initialExpanded,
    onChange: onExpand,
  })
  const expanded = useMemo(() => new Set(expandedList), [expandedList])

  const [sortList, setSortList] = useControllable<SortState[]>({
    value: sort,
    defaultValue: defaultSort ?? [],
    onChange: onSortChange,
  })

  const [filterState, setFilterState] = useControllable<FilterState>({
    value: filter,
    defaultValue: defaultFilter ?? {},
    onChange: onFilterChange,
  })

  const resolvedColumns = useMemo(
    () => resolveColumns(columns, { totalWidth }),
    [columns, totalWidth],
  )

  const accessors = useMemo(() => {
    const fieldMap = new Map<string, keyof T | undefined>()
    const sorterMap: Record<string, (a: T, b: T) => number> = {}
    for (const col of resolvedColumns) {
      fieldMap.set(col.key, col.field)
      if (col.sorter) sorterMap[col.key] = col.sorter
    }
    return {
      getSortValue: (row: T, colKey: string) => {
        const f = fieldMap.get(colKey)
        return f !== undefined ? row[f] : undefined
      },
      getFilterValue: (row: T, colKey: string) => {
        const f = fieldMap.get(colKey)
        return f !== undefined ? row[f] : undefined
      },
      sorters: sorterMap,
    }
  }, [resolvedColumns])

  const visibleRows = useMemo(
    () =>
      serverMode
        ? model.rows.filter((r) => expanded.has(r.parentKey ?? '') || r.parentKey === null)
        : computeVisibleRows(model, expanded, sortList, filterState, accessors),
    [model, expanded, sortList, filterState, accessors, serverMode],
  )

  const toggleExpand = (key: RowKey): void => {
    const next = toggleExpandSet(expanded, key)
    setExpandedList(Array.from(next))
  }

  const toggleSort = (columnKey: string): void => {
    const col = resolvedColumns.find((c) => c.key === columnKey)
    if (!col?.sortable) return
    const next = toggleSortReducer(sortList, columnKey, { multi: col.sortMulti })
    startTransition(() => setSortList(next))
  }

  const setFilter = (columnKey: string, value: NonNullable<FilterValue>): void => {
    const next = setFilterReducer(filterState, columnKey, value)
    startTransition(() => setFilterState(next))
  }

  const clearFilter = (columnKey: string): void => {
    startTransition(() => setFilterState(clearFilterReducer(filterState, columnKey)))
  }

  return {
    model,
    visibleRows,
    columns: resolvedColumns,
    state: { expanded, sort: sortList, filter: filterState },
    actions: {
      toggleExpand,
      toggleSort,
      setFilter,
      clearFilter,
    },
  }
}
```

- [ ] **Step 4: 通过 + 提交**

Run: `pnpm --filter @draggable-table/table test`
Expected: PASS。

```bash
git add packages/table/src/hooks/useTable.ts packages/table/tests/hooks/useTable-sort.test.tsx
git commit -m "feat(table): sort and filter in useTable with useTransition"
```

---

## Task 3: FilterPopover（enum + text）

**Files:**
- Create: `packages/table/src/components/Header/FilterEnum.tsx`
- Create: `packages/table/src/components/Header/FilterText.tsx`
- Create: `packages/table/src/components/Header/FilterPopover.tsx`

- [ ] **Step 1: FilterEnum**

```tsx
import type { ResolvedColumn, FilterValue } from '@draggable-table/core'

export interface FilterEnumProps<T> {
  column: ResolvedColumn<T>
  value: FilterValue
  onChange: (next: NonNullable<FilterValue> | null) => void
}

export function FilterEnum<T>({ column, value, onChange }: FilterEnumProps<T>) {
  if (column.filter?.type !== 'enum') return null
  const options = column.filter.options
  const selected = value?.type === 'enum' ? value.values : []

  const toggle = (v: unknown): void => {
    const set = new Set(selected)
    if (set.has(v)) set.delete(v)
    else set.add(v)
    const arr = Array.from(set)
    onChange(arr.length === 0 ? null : { type: 'enum', values: arr })
  }

  return (
    <div className="dt-filter dt-filter--enum">
      {options.map((opt) => (
        <label key={String(opt.value)} className="dt-filter__option">
          <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} />
          {opt.label}
        </label>
      ))}
      <button type="button" className="dt-filter__clear" onClick={() => onChange(null)}>
        Clear
      </button>
    </div>
  )
}
```

- [ ] **Step 2: FilterText**

```tsx
import { useState } from 'react'
import type { ResolvedColumn, FilterValue } from '@draggable-table/core'

export interface FilterTextProps<T> {
  column: ResolvedColumn<T>
  value: FilterValue
  onChange: (next: NonNullable<FilterValue> | null) => void
  onClose: () => void
}

export function FilterText<T>({ column, value, onChange, onClose }: FilterTextProps<T>) {
  if (column.filter?.type !== 'text') return null
  const predicate = column.filter.predicate ?? 'contains'
  const [text, setText] = useState(value?.type === 'text' ? value.value : '')

  const commit = (): void => {
    if (text.length === 0) onChange(null)
    else onChange({ type: 'text', value: text, predicate })
    onClose()
  }

  return (
    <div className="dt-filter dt-filter--text">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onClose()
        }}
        autoFocus
        placeholder={`Filter by ${predicate}`}
      />
      <button type="button" onClick={commit}>Apply</button>
      <button
        type="button"
        onClick={() => {
          setText('')
          onChange(null)
          onClose()
        }}
      >
        Clear
      </button>
    </div>
  )
}
```

- [ ] **Step 3: FilterPopover**

```tsx
import { useEffect, useRef } from 'react'
import type { ResolvedColumn, FilterValue } from '@draggable-table/core'
import { FilterEnum } from './FilterEnum.js'
import { FilterText } from './FilterText.js'

export interface FilterPopoverProps<T> {
  column: ResolvedColumn<T>
  anchor: HTMLElement
  value: FilterValue
  onChange: (next: NonNullable<FilterValue> | null) => void
  onClose: () => void
}

export function FilterPopover<T>({
  column,
  anchor,
  value,
  onChange,
  onClose,
}: FilterPopoverProps<T>) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const rect = anchor.getBoundingClientRect()
    if (ref.current) {
      ref.current.style.top = `${rect.bottom}px`
      ref.current.style.left = `${rect.left}px`
    }

    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchor, onClose])

  return (
    <div
      ref={ref}
      className="dt-filter-popover"
      style={{
        position: 'fixed',
        background: 'white',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        padding: 12,
        zIndex: 1000,
      }}
    >
      {column.filter?.type === 'enum' && (
        <FilterEnum column={column} value={value} onChange={onChange} />
      )}
      {column.filter?.type === 'text' && (
        <FilterText column={column} value={value} onChange={onChange} onClose={onClose} />
      )}
      {column.filter?.type === 'custom' &&
        (column.filter.render as (ctx: unknown) => unknown)({
          columnKey: column.key,
          value: value?.type === 'custom' ? value.value : undefined,
          onChange: (v: unknown) =>
            onChange(v === undefined || v === null ? null : { type: 'custom', value: v }),
          close: onClose,
        })}
    </div>
  )
}
```

- [ ] **Step 4: 提交**

```bash
git add packages/table/src/components/Header
git commit -m "feat(table): filter popover with enum / text / custom types"
```

---

## Task 4: Table 集成排序 + 筛选

**Files:**
- Modify: `packages/table/src/Table.tsx`

- [ ] **Step 1: 更新 Table 里 HeaderGroup 的调用，接收 sort/filter 状态**

先修改 HeaderGroup 让 leaf 层的 HeaderCell 拿到 sort/filter callbacks。修改 `packages/table/src/components/Header/HeaderGroup.tsx`：

```tsx
import type { ColumnDef, ResolvedColumn, SortDirection, SortState, FilterState } from '@draggable-table/core'
import { HeaderCell } from './HeaderCell.js'

// ...（保留 buildRows 函数不变）

export interface HeaderGroupProps<T> {
  columns: readonly ColumnDef<T>[]
  resolved: readonly ResolvedColumn<T>[]
  sortState?: readonly SortState[]
  filterState?: Readonly<FilterState>
  onToggleSort?: (columnKey: string) => void
  onOpenFilter?: (columnKey: string, anchor: HTMLElement) => void
}

export function HeaderGroup<T>({
  columns,
  resolved,
  sortState = [],
  filterState = {},
  onToggleSort,
  onOpenFilter,
}: HeaderGroupProps<T>) {
  const rows = buildRows(columns, resolved)
  const resolvedByKey = new Map(resolved.map((r) => [r.key, r]))

  return (
    <div className="dt-header" role="rowgroup">
      {rows.map((row, i) => (
        <div key={i} className="dt-header__row" role="row">
          {row.map((item) => {
            const resolvedCol = resolvedByKey.get(item.node.key)
            const sortDir: SortDirection | null =
              sortState.find((s) => s.columnKey === item.node.key)?.direction ?? null
            return (
              <HeaderCell
                key={item.node.key}
                column={{
                  key: item.node.key,
                  title: item.node.title,
                  field: resolvedCol?.field,
                  computedWidth: item.span,
                  minWidth: 0,
                  maxWidth: 0,
                  hidden: false,
                  sortable: item.isLeaf ? (resolvedCol?.sortable ?? false) : false,
                  sortMulti: resolvedCol?.sortMulti ?? false,
                  filter: item.isLeaf ? resolvedCol?.filter : undefined,
                  depth: 0,
                }}
                width={item.span}
                sortDirection={sortDir}
                onToggleSort={(k) => onToggleSort?.(k)}
                filterActive={filterState[item.node.key] != null}
                onOpenFilter={onOpenFilter}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Table 组件加入 popover 状态**

在 Table.tsx 中加入本地 popover state 和渲染 FilterPopover。在返回 JSX 前加：

```tsx
import { FilterPopover } from './components/Header/FilterPopover.js'

// inside Table<T>()
const [filterAnchor, setFilterAnchor] = useState<{ columnKey: string; anchor: HTMLElement } | null>(null)
```

然后 HeaderGroup 处传入 handlers：

```tsx
<HeaderGroup
  columns={userColumns}
  resolved={centerColumns}
  sortState={state.sort}
  filterState={state.filter}
  onToggleSort={actions.toggleSort}
  onOpenFilter={(columnKey, anchor) => setFilterAnchor({ columnKey, anchor })}
/>
```

在整个 `.dt-table` div 结尾（`</div>` 之前）加：

```tsx
{filterAnchor && (
  <FilterPopover
    column={columns.find((c) => c.key === filterAnchor.columnKey)!}
    anchor={filterAnchor.anchor}
    value={state.filter[filterAnchor.columnKey] ?? null}
    onChange={(v) => {
      if (v === null) actions.clearFilter(filterAnchor.columnKey)
      else actions.setFilter(filterAnchor.columnKey, v)
    }}
    onClose={() => setFilterAnchor(null)}
  />
)}
```

- [ ] **Step 3: 测试 + typecheck**

Run: `pnpm --filter @draggable-table/table typecheck && pnpm --filter @draggable-table/table test`
Expected: PASS。

- [ ] **Step 4: 提交**

```bash
git add packages/table/src
git commit -m "feat(table): integrate sort + filter into Table"
```

---

## Task 5: useServerData + Server 模式

**Files:**
- Create: `packages/table/src/hooks/useServerData.ts`
- Create: `packages/table/tests/hooks/useServerData.test.tsx`

- [ ] **Step 1: 测试**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useServerData } from '../../src/hooks/useServerData.js'

describe('useServerData', () => {
  it('calls onRequest on mount and stores rows', async () => {
    const onRequest = vi.fn().mockResolvedValue({ rows: [{ id: 1 }], total: 1 })
    const { result } = renderHook(() =>
      useServerData({ onRequest, sort: [], filter: {}, page: 1, pageSize: 10 }),
    )
    await waitFor(() => expect(result.current.rows.length).toBe(1))
    expect(onRequest).toHaveBeenCalledWith({ page: 1, pageSize: 10, sort: [], filter: {} })
  })

  it('ignores stale response when params change during in-flight', async () => {
    let resolveFirst: ((v: unknown) => void) | null = null
    const onRequest = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce({ rows: [{ id: 2 }], total: 1 })

    const { result, rerender } = renderHook(
      ({ p }) => useServerData({ onRequest, sort: [], filter: {}, page: p, pageSize: 10 }),
      { initialProps: { p: 1 } },
    )

    rerender({ p: 2 })
    await waitFor(() => expect(result.current.rows.length).toBe(1))

    // late resolution of first request should be ignored
    act(() => resolveFirst?.({ rows: [{ id: 999 }], total: 1 }))
    await Promise.resolve()
    expect(result.current.rows).toEqual([{ id: 2 }])
  })

  it('exposes loading state during request', async () => {
    let resolve: ((v: unknown) => void) | null = null
    const onRequest = vi.fn(() => new Promise((r) => (resolve = r)))
    const { result } = renderHook(() =>
      useServerData({ onRequest, sort: [], filter: {}, page: 1, pageSize: 10 }),
    )
    expect(result.current.loading).toBe(true)
    act(() => resolve?.({ rows: [], total: 0 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('captures error and clears loading', async () => {
    const onRequest = vi.fn().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() =>
      useServerData({ onRequest, sort: [], filter: {}, page: 1, pageSize: 10 }),
    )
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.loading).toBe(false)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @draggable-table/table test tests/hooks/useServerData.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/table/src/hooks/useServerData.ts`:

```ts
import { useEffect, useRef, useState } from 'react'
import type { FilterState, SortState } from '@draggable-table/core'

export interface RequestParams {
  page?: number
  pageSize?: number
  sort: SortState[]
  filter: FilterState
  cursor?: string | number
  limit?: number
}

export interface ServerDataOptions<T> {
  onRequest: (params: RequestParams) => Promise<{ rows: T[]; total: number; cursor?: unknown }>
  sort: SortState[]
  filter: FilterState
  page?: number
  pageSize?: number
}

export interface ServerDataState<T> {
  rows: T[]
  total: number
  loading: boolean
  error: unknown
  refetch: () => void
}

export function useServerData<T>(options: ServerDataOptions<T>): ServerDataState<T> {
  const { onRequest, sort, filter, page, pageSize } = options
  const [rows, setRows] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const requestIdRef = useRef(0)

  const fetch = (): void => {
    const id = ++requestIdRef.current
    setLoading(true)
    setError(null)
    onRequest({ sort, filter, ...(page !== undefined ? { page } : {}), ...(pageSize !== undefined ? { pageSize } : {}) })
      .then((res) => {
        if (id !== requestIdRef.current) return // stale
        setRows(res.rows)
        setTotal(res.total)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (id !== requestIdRef.current) return
        setError(err)
        setLoading(false)
      })
  }

  useEffect(fetch, [onRequest, sort, filter, page, pageSize])

  return { rows, total, loading, error, refetch: fetch }
}
```

- [ ] **Step 4: 通过 + 提交**

Run: `pnpm --filter @draggable-table/table test`
Expected: PASS。

```bash
git add packages/table/src/hooks/useServerData.ts packages/table/tests/hooks/useServerData.test.tsx
git commit -m "feat(table): useServerData with requestId concurrency guard"
```

---

## Task 6: useInfiniteScroll

**Files:**
- Create: `packages/table/src/hooks/useInfiniteScroll.ts`

- [ ] **Step 1: 实现**

```ts
import { useEffect, useRef } from 'react'

export interface UseInfiniteScrollOptions {
  hasMore: boolean
  onLoadMore: () => Promise<void>
  scrollTop: number
  totalHeight: number
  viewportHeight: number
  threshold?: number
}

export function useInfiniteScroll({
  hasMore,
  onLoadMore,
  scrollTop,
  totalHeight,
  viewportHeight,
  threshold = 200,
}: UseInfiniteScrollOptions): void {
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (!hasMore || inFlightRef.current) return
    const distance = totalHeight - (scrollTop + viewportHeight)
    if (distance > threshold) return

    inFlightRef.current = true
    onLoadMore().finally(() => {
      inFlightRef.current = false
    })
  }, [hasMore, onLoadMore, scrollTop, totalHeight, viewportHeight, threshold])
}
```

- [ ] **Step 2: 提交**

```bash
git add packages/table/src/hooks/useInfiniteScroll.ts
git commit -m "feat(table): useInfiniteScroll fires onLoadMore near bottom"
```

---

## Task 7: Playground demos 08 + 09

**Files:**
- Create: `apps/playground/src/examples/08-server-side.tsx`
- Create: `apps/playground/src/examples/09-infinite-scroll.tsx`
- Modify: `apps/playground/src/App.tsx`

- [ ] **Step 1: 08-server-side.tsx**

```tsx
import { useCallback, useState } from 'react'
import { Table } from '@draggable-table/table'
import { useServerData } from '@draggable-table/table'
import type { SortState, FilterState } from '@draggable-table/core'
import { generateFlat, type MockRow } from '../data/mock.js'

const ALL = generateFlat(200)

export function ServerSide() {
  const [sort, setSort] = useState<SortState[]>([])
  const [filter, setFilter] = useState<FilterState>({})
  const [page, setPage] = useState(1)

  const onRequest = useCallback(async (params: any) => {
    await new Promise((r) => setTimeout(r, 200))
    let rows = ALL.slice()
    for (const s of params.sort as SortState[]) {
      rows = rows.slice().sort((a: any, b: any) => {
        const cmp = a[s.columnKey] < b[s.columnKey] ? -1 : a[s.columnKey] > b[s.columnKey] ? 1 : 0
        return s.direction === 'asc' ? cmp : -cmp
      })
    }
    const start = (params.page - 1) * params.pageSize
    return { rows: rows.slice(start, start + params.pageSize), total: rows.length }
  }, [])

  const { rows, total, loading } = useServerData<MockRow>({
    onRequest,
    sort,
    filter,
    page,
    pageSize: 20,
  })

  return (
    <>
      <h2>Server-side mode</h2>
      <p>Total: {total} {loading && '(loading...)'}</p>
      <div style={{ marginBottom: 12 }}>
        Page:{' '}
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPage(n)}
            style={{ marginRight: 4, background: page === n ? '#eff6ff' : 'white' }}
          >
            {n}
          </button>
        ))}
      </div>
      <Table<MockRow>
        data={rows}
        rowKey="id"
        sort={sort}
        onSortChange={setSort}
        filter={filter}
        onFilterChange={setFilter}
        columns={[
          { key: 'id', title: 'ID', field: 'id', width: 100, sortable: true },
          { key: 'name', title: 'Name', field: 'name', width: 200, sortable: true },
          { key: 'age', title: 'Age', field: 'age', width: 100, sortable: true },
          { key: 'city', title: 'City', field: 'city', width: 200 },
        ]}
      />
    </>
  )
}
```

- [ ] **Step 2: 09-infinite-scroll.tsx**

```tsx
import { useCallback, useState } from 'react'
import { Table } from '@draggable-table/table'
import { generateFlat, type MockRow } from '../data/mock.js'

const PAGE = 100
const TOTAL = 1000

export function InfiniteScroll() {
  const [rows, setRows] = useState<MockRow[]>(() => generateFlat(PAGE))
  const [hasMore, setHasMore] = useState(true)

  const loadMore = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 300))
    setRows((prev) => {
      const start = prev.length
      const next = generateFlat(PAGE).map((r, i) => ({ ...r, id: start + i }))
      const combined = [...prev, ...next]
      if (combined.length >= TOTAL) setHasMore(false)
      return combined
    })
  }, [])

  return (
    <>
      <h2>Infinite scroll (client-driven)</h2>
      <p>Loaded: {rows.length} / {TOTAL}</p>
      <Table<MockRow>
        data={rows}
        rowKey="id"
        virtual
        height={600}
        infiniteScroll={{ hasMore, onLoadMore: loadMore }}
        columns={[
          { key: 'id', title: 'ID', field: 'id', width: 100 },
          { key: 'name', title: 'Name', field: 'name', width: 200 },
          { key: 'age', title: 'Age', field: 'age', width: 100 },
          { key: 'city', title: 'City', field: 'city', width: 200 },
        ]}
      />
    </>
  )
}
```

Note: `infiniteScroll` prop 需要在 TableProps 里加，见下步。

- [ ] **Step 3: Table 集成 infiniteScroll**

在 `packages/table/src/Table.tsx` 的 TableProps 加：

```ts
infiniteScroll?: {
  hasMore: boolean
  onLoadMore: () => Promise<void>
  threshold?: number
}
```

在 Table 函数里，用 useInfiniteScroll：

```tsx
import { useInfiniteScroll } from './hooks/useInfiniteScroll.js'

// 在 virtualized 分支里，把 scrollTop / totalHeight / viewportHeight 交给 useInfiniteScroll
useInfiniteScroll({
  hasMore: props.infiniteScroll?.hasMore ?? false,
  onLoadMore: props.infiniteScroll?.onLoadMore ?? (async () => {}),
  scrollTop: virt.scrollTop,
  totalHeight: virt.totalHeight,
  viewportHeight: viewportHeight - headerHeight,
  threshold: props.infiniteScroll?.threshold ?? 200,
})
```

- [ ] **Step 4: 更新 App 路由**

在 examples 数组加入两个新 demo。

- [ ] **Step 5: 导出 useServerData**

修改 `packages/table/src/index.tsx` 加：

```tsx
export { useServerData, type RequestParams } from './hooks/useServerData.js'
```

- [ ] **Step 6: 手工验证 + 提交**

Run: `pnpm dev`
- 08 demo：点击列头能排序（Header 显示箭头，200ms 后 rows 更新），切换 page 触发新 request
- 09 demo：滚到底部自动加载下一页，直到 1000 行为止

```bash
git add apps/playground packages/table/src
git commit -m "feat(playground): server-side and infinite-scroll demos"
```

---

## Acceptance Criteria (from spec §19 M4)

- [ ] Server 模式：所有 sort/filter/paging 参数正确发到 onRequest（08 demo 手工验证；useServerData 单测覆盖）
- [ ] 并发多次点击排序：只有最后一次 request 的结果生效（useServerData 单测已验证 stale ignoring）
- [ ] 无限滚动触底：`onLoadMore` 触发；返回后追加数据（09 demo 手工验证）
- [ ] 客户端模式 + 10 万行 + sort 切换：视口滚动不卡（在 05 demo 上加临时 sort 按钮验证）

---

## Self-Review Notes

**Coverage vs spec §10-13 + §19 M4**:
- Header 排序 icon + 点击 (asc → desc → null) ✓ Task 1/2
- 多列排序 (sortable: { multi: true }) ✓ Task 2
- 内置 FilterPopover (enum + text) ✓ Task 3
- Custom filter ✓ Task 3
- Server 模式 + requestId 并发保护 ✓ Task 5
- 无限滚动 ✓ Task 6/7
- useTransition 包 sort/filter setState ✓ Task 2

**Cross-cutting reminders applied**:
- server 模式下 sort/filter 不本地执行 ✓（useTable 里 `serverMode` flag 短路 computeVisibleRows）
- useTransition 只包 sort/filter，不包 expand ✓
- 失败不内置重试：useServerData 只 setError，业务方决定 UI 表现 ✓
