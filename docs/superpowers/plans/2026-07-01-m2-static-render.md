# M2: 静态渲染 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `<Table>` 能显示表格但没有任何交互。1000 行嵌套树能展示，展开/收起 OK，左右固定列在横向滚动时保持位置正确，多级表头层级正确。`useTable` hook 单独使用能拿到 `visibleRows`。

**Architecture:** 引入 React 19 组件层。`<Table>` 用一个 `useTable` hook 组合 core 状态，`useControllable` 处理受控/非受控（`expandedKeys`）。DOM 结构一开始就用 M3/M5 的最终布局：viewport + spacer + 独立 sticky 面板。M2 里 viewport 不启用滚动（`overflow: visible` 展开全部行），M3 再切换到虚拟滚动。样式在 theme 包里写 CSS 变量。

**Tech Stack:** React 19, @testing-library/react, jsdom, Vitest, tsdown

**Spec reference:** [`../specs/2026-07-01-draggable-table-design.md`](../specs/2026-07-01-draggable-table-design.md) §8, §10, §12.3, §15, §19 M2

---

## File Structure

```
packages/table/
├── src/
│   ├── hooks/
│   │   ├── useControllable.ts           受控/非受控通用逻辑
│   │   ├── useTable.ts                  顶层 headless hook（M2 版）
│   │   └── index.ts
│   ├── context/
│   │   └── TableContext.ts              避免深层 prop drill
│   ├── components/
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   ├── HeaderCell.tsx
│   │   │   └── HeaderGroup.tsx          多级表头行
│   │   ├── Body/
│   │   │   ├── Body.tsx
│   │   │   ├── Row.tsx
│   │   │   ├── Cell.tsx
│   │   │   └── ExpandIcon.tsx
│   │   ├── FixedPane/
│   │   │   ├── FixedLeftPane.tsx
│   │   │   └── FixedRightPane.tsx
│   │   └── icons/
│   │       └── ChevronRight.tsx
│   ├── utils/
│   │   └── ssr.ts                       useIsomorphicLayoutEffect
│   ├── Table.tsx                        主组件
│   └── index.tsx
├── tests/
│   ├── Table.test.tsx                   渲染 + 树展开
│   ├── hooks/
│   │   ├── useControllable.test.ts
│   │   └── useTable.test.tsx
│   └── components/
│       ├── FixedPane.test.tsx
│       └── MultiHeader.test.tsx
└── vitest.config.ts

packages/theme/src/
├── vars.css
├── base.css
├── table.css
├── header.css
├── row.css
├── fixed.css
└── index.css
```

---

## Task 1: Vitest + jsdom + RTL 环境

**Files:**
- Modify: `packages/table/package.json`
- Create: `packages/table/vitest.config.ts`
- Create: `packages/table/tests/setup.ts`

- [ ] **Step 1: 加 devDependencies**

`packages/table/package.json` 的 devDependencies 加入：

```json
"@testing-library/react": "^16.0.0",
"@testing-library/dom": "^10.0.0",
"@vitest/coverage-v8": "^2.1.0",
"jsdom": "^25.0.0",
"vitest": "^2.1.0"
```

test scripts 改为：

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 2: 创建 `packages/table/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/index.tsx', 'src/**/index.ts'],
      thresholds: {
        lines: 75,
      },
    },
  },
})
```

- [ ] **Step 3: 创建 `packages/table/tests/setup.ts`**

```ts
import '@testing-library/react'
```

- [ ] **Step 4: 安装 + 冒烟测试**

Run: `pnpm install && pnpm --filter @draggable-table/table test`
Expected: 无测试文件也应通过（vitest 自动 pass-with-no-tests 默认不开）。若失败，把 config 里的 `test` 加 `passWithNoTests: true`。

- [ ] **Step 5: 提交**

```bash
git add packages/table/package.json packages/table/vitest.config.ts packages/table/tests/setup.ts
git commit -m "chore(table): add vitest + jsdom + RTL"
```

---

## Task 2: useControllable

**Files:**
- Create: `packages/table/src/hooks/useControllable.ts`
- Create: `packages/table/tests/hooks/useControllable.test.tsx`

- [ ] **Step 1: 测试**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useControllable } from '../../src/hooks/useControllable.js'

describe('useControllable', () => {
  it('uncontrolled: uses defaultValue and updates via setValue', () => {
    const { result } = renderHook(() =>
      useControllable<number>({ defaultValue: 5, onChange: undefined }),
    )
    expect(result.current[0]).toBe(5)
    act(() => result.current[1](10))
    expect(result.current[0]).toBe(10)
  })

  it('controlled: uses value prop and calls onChange', () => {
    const onChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) =>
        useControllable<number>({ value, defaultValue: 0, onChange }),
      { initialProps: { value: 3 } },
    )
    expect(result.current[0]).toBe(3)
    act(() => result.current[1](7))
    expect(onChange).toHaveBeenCalledWith(7)
    // controlled: internal state does NOT change without prop update
    rerender({ value: 7 })
    expect(result.current[0]).toBe(7)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @draggable-table/table test tests/hooks/useControllable.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/table/src/hooks/useControllable.ts`:

```ts
import { useCallback, useRef, useState } from 'react'

export interface ControllableOptions<T> {
  value?: T
  defaultValue: T
  onChange?: (next: T) => void
}

export function useControllable<T>({
  value,
  defaultValue,
  onChange,
}: ControllableOptions<T>): [T, (next: T) => void] {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState<T>(defaultValue)

  const hasWarned = useRef(false)
  if (
    !hasWarned.current &&
    isControlled &&
    process.env.NODE_ENV !== 'production' &&
    onChange === undefined
  ) {
    // eslint-disable-next-line no-console
    console.warn('[draggable-table] controlled value provided without onChange')
    hasWarned.current = true
  }

  const set = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next)
      onChange?.(next)
    },
    [isControlled, onChange],
  )

  return [isControlled ? (value as T) : internal, set]
}
```

- [ ] **Step 4: 通过**

Run: `pnpm --filter @draggable-table/table test tests/hooks/useControllable.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/table/src/hooks/useControllable.ts packages/table/tests/hooks/useControllable.test.tsx
git commit -m "feat(table): useControllable hook for controlled/uncontrolled state"
```

---

## Task 3: useTable（M2 版：仅数据 + 展开）

**Files:**
- Create: `packages/table/src/hooks/useTable.ts`
- Create: `packages/table/src/context/TableContext.ts`
- Create: `packages/table/tests/hooks/useTable.test.tsx`

- [ ] **Step 1: 测试**

```tsx
import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTable } from '../../src/hooks/useTable.js'

interface Row {
  id: string
  name: string
  children?: Row[]
}

const data: Row[] = [
  {
    id: 'a',
    name: 'A',
    children: [{ id: 'a-1', name: 'A1' }],
  },
  { id: 'b', name: 'B' },
]

describe('useTable', () => {
  it('returns flat visibleRows respecting expanded state (root only by default)', () => {
    const { result } = renderHook(() =>
      useTable<Row>({
        data,
        rowKey: 'id',
        tree: { mode: 'children', childrenKey: 'children' },
        columns: [{ key: 'name', field: 'name' }],
      }),
    )
    expect(result.current.visibleRows.map((r) => r.key)).toEqual(['a', 'b'])
  })

  it('toggleExpand adds/removes and updates visibleRows', () => {
    const { result } = renderHook(() =>
      useTable<Row>({
        data,
        rowKey: 'id',
        tree: { mode: 'children', childrenKey: 'children' },
        columns: [{ key: 'name', field: 'name' }],
      }),
    )
    act(() => result.current.actions.toggleExpand('a'))
    expect(result.current.visibleRows.map((r) => r.key)).toEqual(['a', 'a-1', 'b'])
  })

  it('respects defaultExpandedDepth', () => {
    const { result } = renderHook(() =>
      useTable<Row>({
        data,
        rowKey: 'id',
        tree: { mode: 'children', childrenKey: 'children' },
        columns: [{ key: 'name', field: 'name' }],
        defaultExpandedDepth: 1,
      }),
    )
    expect(result.current.visibleRows.map((r) => r.key)).toEqual(['a', 'a-1', 'b'])
  })

  it('resolvedColumns has computed widths', () => {
    const { result } = renderHook(() =>
      useTable<Row>({
        data,
        rowKey: 'id',
        columns: [{ key: 'name', field: 'name', width: 200 }],
      }),
    )
    expect(result.current.columns[0]?.computedWidth).toBe(200)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @draggable-table/table test tests/hooks/useTable.test.tsx`
Expected: FAIL。

- [ ] **Step 3: TableContext**

`packages/table/src/context/TableContext.ts`:

```ts
import { createContext, useContext } from 'react'
import type { InternalRow, ResolvedColumn, RowKey } from '@draggable-table/core'

export interface TableContextValue<T = unknown> {
  visibleRows: readonly InternalRow<T>[]
  columns: readonly ResolvedColumn<T>[]
  expanded: ReadonlySet<RowKey>
  toggleExpand: (key: RowKey) => void
}

export const TableContext = createContext<TableContextValue | null>(null)

export function useTableContext<T = unknown>(): TableContextValue<T> {
  const ctx = useContext(TableContext)
  if (!ctx) throw new Error('useTableContext must be used within <Table>')
  return ctx as TableContextValue<T>
}
```

- [ ] **Step 4: 实现 useTable（M2 版）**

`packages/table/src/hooks/useTable.ts`:

```ts
import { useMemo } from 'react'
import {
  DataModel,
  computeVisibleRows,
  expandToDepth,
  resolveColumns,
  toggleExpand as toggleExpandSet,
  type ColumnDef,
  type DataSource,
  type RowKey,
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

  totalWidth?: number // for column layout; defaults to 800 in M2
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
    totalWidth = 800,
  } = options

  const model = useMemo(
    () => DataModel.from<T>({ data, rowKey, ...(tree ? { tree } : {}) }),
    [data, rowKey, tree],
  )

  const initialExpanded = useMemo<RowKey[]>(() => {
    if (defaultExpandedKeys) return defaultExpandedKeys
    if (defaultExpandedDepth !== undefined) {
      return Array.from(expandToDepth(model, defaultExpandedDepth))
    }
    return []
  }, [model, defaultExpandedKeys, defaultExpandedDepth])

  const [expandedList, setExpandedList] = useControllable<RowKey[]>({
    value: expandedKeys,
    defaultValue: initialExpanded,
    onChange: onExpand,
  })

  const expanded = useMemo(() => new Set(expandedList), [expandedList])

  const resolvedColumns = useMemo(
    () => resolveColumns(columns, { totalWidth }),
    [columns, totalWidth],
  )

  const visibleRows = useMemo(
    () => computeVisibleRows(model, expanded, [], {}),
    [model, expanded],
  )

  const toggleExpand = (key: RowKey): void => {
    const next = toggleExpandSet(expanded, key)
    setExpandedList(Array.from(next))
  }

  return {
    model,
    visibleRows,
    columns: resolvedColumns,
    state: { expanded },
    actions: { toggleExpand },
  }
}
```

- [ ] **Step 5: 通过**

Run: `pnpm --filter @draggable-table/table test`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add packages/table/src/hooks/useTable.ts packages/table/src/context/TableContext.ts packages/table/tests/hooks/useTable.test.tsx
git commit -m "feat(table): useTable hook with data model + expand"
```

---

## Task 4: 基础组件 — ExpandIcon + Cell + Row

**Files:**
- Create: `packages/table/src/components/icons/ChevronRight.tsx`
- Create: `packages/table/src/components/Body/ExpandIcon.tsx`
- Create: `packages/table/src/components/Body/Cell.tsx`
- Create: `packages/table/src/components/Body/Row.tsx`

- [ ] **Step 1: ChevronRight（inline SVG）**

```tsx
import type { SVGProps } from 'react'

export function ChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 12l4-4-4-4" />
    </svg>
  )
}
```

- [ ] **Step 2: ExpandIcon**

`packages/table/src/components/Body/ExpandIcon.tsx`:

```tsx
import { ChevronRight } from '../icons/ChevronRight.js'

export interface ExpandIconProps {
  expanded: boolean
  onClick: (e: React.MouseEvent) => void
  hidden?: boolean
}

export function ExpandIcon({ expanded, onClick, hidden }: ExpandIconProps) {
  if (hidden) return <span className="dt-expand-icon dt-expand-icon--placeholder" aria-hidden />
  return (
    <button
      type="button"
      className="dt-expand-icon"
      aria-label={expanded ? 'Collapse row' : 'Expand row'}
      aria-expanded={expanded}
      onClick={onClick}
    >
      <ChevronRight
        style={{
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 120ms ease',
        }}
      />
    </button>
  )
}
```

- [ ] **Step 3: Cell**

`packages/table/src/components/Body/Cell.tsx`:

```tsx
import type { InternalRow, ResolvedColumn } from '@draggable-table/core'
import type { ReactNode } from 'react'

export interface CellProps<T> {
  row: InternalRow<T>
  column: ResolvedColumn<T>
  rowIndex: number
  isExpanded: boolean
  children?: ReactNode
}

export function Cell<T>({ row, column, rowIndex, isExpanded, children }: CellProps<T>) {
  const value =
    column.field !== undefined ? row.raw[column.field] : undefined
  const rendered = column.render
    ? column.render(row.raw, { rowIndex, rowKey: row.key, depth: row.depth, isExpanded, isSelected: false })
    : (value as ReactNode)

  return (
    <div
      className="dt-cell"
      role="gridcell"
      style={{ width: column.computedWidth }}
      data-column-key={column.key}
    >
      <div className="dt-cell__content">
        {children}
        {rendered as ReactNode}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Row**

`packages/table/src/components/Body/Row.tsx`:

```tsx
import type { InternalRow, ResolvedColumn, RowKey } from '@draggable-table/core'
import { Cell } from './Cell.js'
import { ExpandIcon } from './ExpandIcon.js'

export interface RowProps<T> {
  row: InternalRow<T>
  columns: readonly ResolvedColumn<T>[]
  rowIndex: number
  expanded: boolean
  onToggleExpand: (key: RowKey) => void
}

const INDENT_PX = 20

export function Row<T>({
  row,
  columns,
  rowIndex,
  expanded,
  onToggleExpand,
}: RowProps<T>) {
  return (
    <div
      className="dt-row"
      role="row"
      aria-level={row.depth + 1}
      aria-expanded={row.hasChildren ? expanded : undefined}
      data-row-key={String(row.key)}
    >
      {columns.map((col, i) => (
        <Cell key={col.key} row={row} column={col} rowIndex={rowIndex} isExpanded={expanded}>
          {i === 0 && (
            <span
              className="dt-cell__indent"
              style={{ width: row.depth * INDENT_PX, display: 'inline-block', flexShrink: 0 }}
            />
          )}
          {i === 0 && (
            <ExpandIcon
              expanded={expanded}
              hidden={!row.hasChildren}
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand(row.key)
              }}
            />
          )}
        </Cell>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: 提交**

```bash
git add packages/table/src/components/icons packages/table/src/components/Body
git commit -m "feat(table): row/cell/expand icon components"
```

---

## Task 5: Header + HeaderCell + HeaderGroup (多级表头)

**Files:**
- Create: `packages/table/src/components/Header/Header.tsx`
- Create: `packages/table/src/components/Header/HeaderCell.tsx`
- Create: `packages/table/src/components/Header/HeaderGroup.tsx`
- Create: `packages/table/tests/components/MultiHeader.test.tsx`

- [ ] **Step 1: 测试多级表头**

`packages/table/tests/components/MultiHeader.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table } from '../../src/Table.js'

interface Row {
  id: string
  a: number
  b: number
  c: number
}

describe('multi-level header', () => {
  it('renders group header row with correct colspan-like spanning', () => {
    render(
      <Table<Row>
        data={[{ id: '1', a: 1, b: 2, c: 3 }]}
        rowKey="id"
        columns={[
          {
            key: 'group1',
            title: 'Group 1',
            children: [
              { key: 'a', title: 'A', field: 'a' },
              { key: 'b', title: 'B', field: 'b' },
            ],
          },
          { key: 'c', title: 'C', field: 'c' },
        ]}
      />,
    )
    expect(screen.getByText('Group 1')).toBeDefined()
    expect(screen.getByText('A')).toBeDefined()
    expect(screen.getByText('C')).toBeDefined()
  })
})
```

- [ ] **Step 2: HeaderCell**

`packages/table/src/components/Header/HeaderCell.tsx`:

```tsx
import type { ResolvedColumn } from '@draggable-table/core'
import type { ReactNode } from 'react'

export interface HeaderCellProps<T> {
  column: ResolvedColumn<T>
  width?: number
}

export function HeaderCell<T>({ column, width }: HeaderCellProps<T>) {
  const rendered: ReactNode =
    typeof column.title === 'function'
      ? (column.title as () => ReactNode)()
      : ((column.title ?? column.key) as ReactNode)

  return (
    <div
      className="dt-header-cell"
      role="columnheader"
      style={{ width: width ?? column.computedWidth }}
      aria-label={column.ariaLabel ?? String(column.key)}
    >
      <div className="dt-header-cell__content">{rendered}</div>
    </div>
  )
}
```

- [ ] **Step 3: HeaderGroup + Header**

`packages/table/src/components/Header/HeaderGroup.tsx`:

```tsx
import type { ColumnDef, ResolvedColumn } from '@draggable-table/core'
import { HeaderCell } from './HeaderCell.js'

type Node<T> = ColumnDef<T>

interface Row<T> {
  node: Node<T>
  span: number
  isLeaf: boolean
}

function buildRows<T>(
  columns: readonly ColumnDef<T>[],
  resolved: readonly ResolvedColumn<T>[],
): Row<T>[][] {
  // For M2 simple version: compute max depth and layer per depth.
  let maxDepth = 0
  const walk = (col: ColumnDef<T>, depth: number): void => {
    maxDepth = Math.max(maxDepth, depth)
    col.children?.forEach((c) => walk(c, depth + 1))
  }
  columns.forEach((c) => walk(c, 0))

  const rows: Row<T>[][] = Array.from({ length: maxDepth + 1 }, () => [])

  const leafWidth = new Map<string, number>()
  resolved.forEach((r) => leafWidth.set(r.key, r.computedWidth))

  const collectSpan = (col: ColumnDef<T>): number => {
    if (!col.children || col.children.length === 0) {
      return leafWidth.get(col.key) ?? 0
    }
    return col.children.reduce((sum, c) => sum + collectSpan(c), 0)
  }

  const walkPlace = (col: ColumnDef<T>, depth: number): void => {
    const isLeaf = !col.children || col.children.length === 0
    const span = collectSpan(col)
    rows[depth]!.push({ node: col, span, isLeaf })
    col.children?.forEach((c) => walkPlace(c, depth + 1))
  }
  columns.forEach((c) => walkPlace(c, 0))

  return rows
}

export interface HeaderGroupProps<T> {
  columns: readonly ColumnDef<T>[]
  resolved: readonly ResolvedColumn<T>[]
}

export function HeaderGroup<T>({ columns, resolved }: HeaderGroupProps<T>) {
  const rows = buildRows(columns, resolved)
  return (
    <div className="dt-header" role="rowgroup">
      {rows.map((row, i) => (
        <div key={i} className="dt-header__row" role="row">
          {row.map((item) => (
            <HeaderCell
              key={item.node.key}
              column={{
                key: item.node.key,
                title: item.node.title,
                computedWidth: item.span,
                minWidth: 0,
                maxWidth: 0,
                hidden: false,
                sortable: false,
                sortMulti: false,
                depth: 0,
              }}
              width={item.span}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
```

`packages/table/src/components/Header/Header.tsx`:

```tsx
export { HeaderGroup as Header } from './HeaderGroup.js'
```

- [ ] **Step 4: 提交**

```bash
git add packages/table/src/components/Header
git commit -m "feat(table): header components with multi-level support"
```

---

## Task 6: FixedPane

**Files:**
- Create: `packages/table/src/components/FixedPane/FixedLeftPane.tsx`
- Create: `packages/table/src/components/FixedPane/FixedRightPane.tsx`
- Create: `packages/table/tests/components/FixedPane.test.tsx`

- [ ] **Step 1: 测试**

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table } from '../../src/Table.js'

interface Row {
  id: string
  a: string
  b: string
  c: string
}

describe('fixed panes', () => {
  it('renders left and right sticky panes for fixed columns', () => {
    const { container } = render(
      <Table<Row>
        data={[{ id: '1', a: 'A', b: 'B', c: 'C' }]}
        rowKey="id"
        columns={[
          { key: 'a', title: 'A', field: 'a', fixed: 'left' },
          { key: 'b', title: 'B', field: 'b' },
          { key: 'c', title: 'C', field: 'c', fixed: 'right' },
        ]}
      />,
    )
    expect(container.querySelector('.dt-fixed-left-pane')).toBeTruthy()
    expect(container.querySelector('.dt-fixed-right-pane')).toBeTruthy()
  })

  it('does not render left pane when no left fixed columns', () => {
    const { container } = render(
      <Table<Row>
        data={[{ id: '1', a: 'A', b: 'B', c: 'C' }]}
        rowKey="id"
        columns={[
          { key: 'a', title: 'A', field: 'a' },
          { key: 'b', title: 'B', field: 'b' },
        ]}
      />,
    )
    expect(container.querySelector('.dt-fixed-left-pane')).toBeFalsy()
  })
})
```

- [ ] **Step 2: FixedLeftPane**

`packages/table/src/components/FixedPane/FixedLeftPane.tsx`:

```tsx
import type { InternalRow, ResolvedColumn, RowKey } from '@draggable-table/core'
import { Row } from '../Body/Row.js'

export interface FixedLeftPaneProps<T> {
  rows: readonly InternalRow<T>[]
  columns: readonly ResolvedColumn<T>[]
  expanded: ReadonlySet<RowKey>
  onToggleExpand: (key: RowKey) => void
}

export function FixedLeftPane<T>({ rows, columns, expanded, onToggleExpand }: FixedLeftPaneProps<T>) {
  if (columns.length === 0) return null
  const width = columns.reduce((sum, c) => sum + c.computedWidth, 0)
  return (
    <div className="dt-fixed-left-pane" style={{ width }} aria-hidden="false">
      {rows.map((row, i) => (
        <Row
          key={String(row.key)}
          row={row}
          columns={columns}
          rowIndex={i}
          expanded={expanded.has(row.key)}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: FixedRightPane**

`packages/table/src/components/FixedPane/FixedRightPane.tsx`:

```tsx
import type { InternalRow, ResolvedColumn, RowKey } from '@draggable-table/core'
import { Row } from '../Body/Row.js'

export interface FixedRightPaneProps<T> {
  rows: readonly InternalRow<T>[]
  columns: readonly ResolvedColumn<T>[]
  expanded: ReadonlySet<RowKey>
  onToggleExpand: (key: RowKey) => void
}

export function FixedRightPane<T>({ rows, columns, expanded, onToggleExpand }: FixedRightPaneProps<T>) {
  if (columns.length === 0) return null
  const width = columns.reduce((sum, c) => sum + c.computedWidth, 0)
  return (
    <div className="dt-fixed-right-pane" style={{ width }} aria-hidden="false">
      {rows.map((row, i) => (
        <Row
          key={String(row.key)}
          row={row}
          columns={columns}
          rowIndex={i}
          expanded={expanded.has(row.key)}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: 提交**

```bash
git add packages/table/src/components/FixedPane packages/table/tests/components/FixedPane.test.tsx
git commit -m "feat(table): left and right fixed sticky panes"
```

---

## Task 7: Body

**Files:**
- Create: `packages/table/src/components/Body/Body.tsx`

- [ ] **Step 1: Body**

`packages/table/src/components/Body/Body.tsx`:

```tsx
import type { InternalRow, ResolvedColumn, RowKey } from '@draggable-table/core'
import { Row } from './Row.js'

export interface BodyProps<T> {
  rows: readonly InternalRow<T>[]
  columns: readonly ResolvedColumn<T>[]
  expanded: ReadonlySet<RowKey>
  onToggleExpand: (key: RowKey) => void
}

export function Body<T>({ rows, columns, expanded, onToggleExpand }: BodyProps<T>) {
  return (
    <div className="dt-body" role="rowgroup">
      {rows.map((row, i) => (
        <Row
          key={String(row.key)}
          row={row}
          columns={columns}
          rowIndex={i}
          expanded={expanded.has(row.key)}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add packages/table/src/components/Body/Body.tsx
git commit -m "feat(table): Body component rendering visible rows"
```

---

## Task 8: Table 主组件

**Files:**
- Create: `packages/table/src/Table.tsx`
- Modify: `packages/table/src/index.tsx`
- Create: `packages/table/tests/Table.test.tsx`

- [ ] **Step 1: 测试**

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Table } from '../src/Table.js'

interface Row {
  id: string
  name: string
  children?: Row[]
}

const data: Row[] = [
  {
    id: 'a',
    name: 'A',
    children: [{ id: 'a-1', name: 'A1' }],
  },
  { id: 'b', name: 'B' },
]

describe('<Table />', () => {
  it('renders columns and root rows', () => {
    render(
      <Table<Row>
        data={data}
        rowKey="id"
        tree={{ mode: 'children', childrenKey: 'children' }}
        columns={[{ key: 'name', title: 'Name', field: 'name' }]}
      />,
    )
    expect(screen.getByText('Name')).toBeDefined()
    expect(screen.getByText('A')).toBeDefined()
    expect(screen.getByText('B')).toBeDefined()
    expect(screen.queryByText('A1')).toBeNull()
  })

  it('expand button reveals children', () => {
    render(
      <Table<Row>
        data={data}
        rowKey="id"
        tree={{ mode: 'children', childrenKey: 'children' }}
        columns={[{ key: 'name', title: 'Name', field: 'name' }]}
      />,
    )
    const btn = screen.getByRole('button', { name: /expand row/i })
    fireEvent.click(btn)
    expect(screen.getByText('A1')).toBeDefined()
  })

  it('supports defaultExpandedDepth', () => {
    render(
      <Table<Row>
        data={data}
        rowKey="id"
        tree={{ mode: 'children', childrenKey: 'children' }}
        columns={[{ key: 'name', title: 'Name', field: 'name' }]}
        defaultExpandedDepth="all"
      />,
    )
    expect(screen.getByText('A1')).toBeDefined()
  })

  it('applies role=grid to root', () => {
    const { container } = render(
      <Table<Row>
        data={data}
        rowKey="id"
        columns={[{ key: 'name', title: 'Name', field: 'name' }]}
      />,
    )
    expect(container.querySelector('[role="grid"]')).toBeTruthy()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @draggable-table/table test`
Expected: FAIL。

- [ ] **Step 3: Table 实现**

`packages/table/src/Table.tsx`:

```tsx
import { useMemo } from 'react'
import type { ColumnDef, DataSource, RowKey } from '@draggable-table/core'
import { useTable } from './hooks/useTable.js'
import { HeaderGroup } from './components/Header/HeaderGroup.js'
import { Body } from './components/Body/Body.js'
import { FixedLeftPane } from './components/FixedPane/FixedLeftPane.js'
import { FixedRightPane } from './components/FixedPane/FixedRightPane.js'

export interface TableProps<T> {
  data: DataSource<T>['data']
  rowKey: DataSource<T>['rowKey']
  tree?: DataSource<T>['tree']
  columns: ColumnDef<T>[]

  expandedKeys?: RowKey[]
  defaultExpandedKeys?: RowKey[]
  defaultExpandedDepth?: number | 'all'
  onExpand?: (keys: RowKey[]) => void

  totalWidth?: number
}

export function Table<T>(props: TableProps<T>) {
  const { columns: userColumns } = props

  const totalWidth =
    props.totalWidth ??
    userColumns.reduce((sum, c) => {
      const collect = (col: ColumnDef<T>): number => {
        if (col.children && col.children.length > 0) {
          return col.children.reduce((s, c2) => s + collect(c2), 0)
        }
        return typeof col.width === 'number' ? col.width : 120
      }
      return sum + collect(c)
    }, 0)

  const { visibleRows, columns, state, actions } = useTable<T>({ ...props, totalWidth })

  const leftFixed = useMemo(() => columns.filter((c) => c.fixed === 'left'), [columns])
  const rightFixed = useMemo(() => columns.filter((c) => c.fixed === 'right'), [columns])
  const centerColumns = useMemo(() => columns.filter((c) => !c.fixed), [columns])

  return (
    <div className="dt-table" role="grid">
      <div className="dt-viewport">
        <HeaderGroup columns={userColumns} resolved={centerColumns} />
        <Body
          rows={visibleRows}
          columns={centerColumns}
          expanded={state.expanded}
          onToggleExpand={actions.toggleExpand}
        />
      </div>
      <FixedLeftPane
        rows={visibleRows}
        columns={leftFixed}
        expanded={state.expanded}
        onToggleExpand={actions.toggleExpand}
      />
      <FixedRightPane
        rows={visibleRows}
        columns={rightFixed}
        expanded={state.expanded}
        onToggleExpand={actions.toggleExpand}
      />
    </div>
  )
}
```

- [ ] **Step 4: 更新 index**

`packages/table/src/index.tsx`:

```tsx
export { Table, type TableProps } from './Table.js'
export { useTable, type UseTableOptions } from './hooks/useTable.js'
export type * from '@draggable-table/core'

export const TABLE_VERSION = '0.0.0'
```

- [ ] **Step 5: 运行 + typecheck**

Run: `pnpm --filter @draggable-table/table test && pnpm --filter @draggable-table/table typecheck`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add packages/table/src packages/table/tests/Table.test.tsx
git commit -m "feat(table): <Table> main component with tree expand"
```

---

## Task 9: 默认 CSS（theme 包）

**Files:**
- Create: `packages/theme/src/vars.css`
- Create: `packages/theme/src/base.css`
- Create: `packages/theme/src/table.css`
- Create: `packages/theme/src/header.css`
- Create: `packages/theme/src/row.css`
- Create: `packages/theme/src/fixed.css`
- Modify: `packages/theme/src/index.css`

- [ ] **Step 1: vars.css**

```css
:root {
  --dt-border-color: #e5e7eb;
  --dt-row-hover-bg: rgba(59, 130, 246, 0.04);
  --dt-row-selected-bg: rgba(59, 130, 246, 0.08);
  --dt-header-bg: #f9fafb;
  --dt-text: #111827;
  --dt-text-muted: #6b7280;

  --dt-cell-padding-x: 12px;
  --dt-cell-padding-y-compact: 4px;
  --dt-cell-padding-y-normal: 8px;
  --dt-cell-padding-y-loose: 16px;

  --dt-row-height: 40px;

  --dt-drop-inside-bg: rgba(248, 113, 113, 0.14);
  --dt-drop-indicator: #3b82f6;

  --dt-font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --dt-font-size: 14px;
}
```

- [ ] **Step 2: base.css**

```css
.dt-table {
  position: relative;
  font-family: var(--dt-font-family);
  font-size: var(--dt-font-size);
  color: var(--dt-text);
  box-sizing: border-box;
}
.dt-table * {
  box-sizing: border-box;
}
```

- [ ] **Step 3: table.css / row.css / header.css / fixed.css**

`packages/theme/src/table.css`:

```css
.dt-viewport {
  overflow: auto;
  position: relative;
}
.dt-body {
  position: relative;
}
```

`packages/theme/src/row.css`:

```css
.dt-row {
  display: flex;
  align-items: stretch;
  min-height: var(--dt-row-height);
  border-bottom: 1px solid var(--dt-border-color);
}
.dt-row:hover {
  background: var(--dt-row-hover-bg);
}
.dt-cell {
  padding: var(--dt-cell-padding-y-normal) var(--dt-cell-padding-x);
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}
.dt-cell__content {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  gap: 4px;
  flex: 1;
}
.dt-expand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  color: var(--dt-text-muted);
}
.dt-expand-icon--placeholder {
  display: inline-block;
  width: 20px;
  height: 20px;
}
```

`packages/theme/src/header.css`:

```css
.dt-header {
  background: var(--dt-header-bg);
  border-bottom: 1px solid var(--dt-border-color);
  position: sticky;
  top: 0;
  z-index: 2;
}
.dt-header__row {
  display: flex;
}
.dt-header-cell {
  padding: var(--dt-cell-padding-y-normal) var(--dt-cell-padding-x);
  display: flex;
  align-items: center;
  color: var(--dt-text-muted);
  font-weight: 600;
  border-right: 1px solid var(--dt-border-color);
}
.dt-header-cell:last-child {
  border-right: none;
}
.dt-header-cell__content {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

`packages/theme/src/fixed.css`:

```css
.dt-fixed-left-pane,
.dt-fixed-right-pane {
  position: absolute;
  top: 0;
  bottom: 0;
  background: white;
  z-index: 1;
  border-color: var(--dt-border-color);
  border-style: solid;
  border-width: 0;
  pointer-events: none;
}
.dt-fixed-left-pane {
  left: 0;
  border-right-width: 1px;
}
.dt-fixed-right-pane {
  right: 0;
  border-left-width: 1px;
}
.dt-fixed-left-pane .dt-row,
.dt-fixed-right-pane .dt-row {
  pointer-events: auto;
}
```

Note: fixed panes 在 M2 阶段直接以 absolute 定位覆盖，M3 引入虚拟滚动后再切成 sticky。M2 里因为 body 没滚动，absolute 已经能演示布局。

- [ ] **Step 4: 汇总 index.css**

`packages/theme/src/index.css`:

```css
@import './vars.css';
@import './base.css';
@import './table.css';
@import './header.css';
@import './row.css';
@import './fixed.css';
```

- [ ] **Step 5: 提交**

```bash
git add packages/theme/src
git commit -m "feat(theme): base css variables and layout styles"
```

---

## Task 10: Playground demo — 01/02/06/07

**Files:**
- Create: `apps/playground/src/examples/01-basic.tsx`
- Create: `apps/playground/src/examples/02-tree.tsx`
- Create: `apps/playground/src/examples/06-fixed-columns.tsx`
- Create: `apps/playground/src/examples/07-multi-header.tsx`
- Modify: `apps/playground/src/App.tsx`
- Modify: `apps/playground/src/main.tsx`

- [ ] **Step 1: 创建 App 路由**

`apps/playground/src/App.tsx`:

```tsx
import { useState } from 'react'
import { Basic } from './examples/01-basic.js'
import { TreeDemo } from './examples/02-tree.js'
import { FixedColumns } from './examples/06-fixed-columns.js'
import { MultiHeader } from './examples/07-multi-header.js'

const examples = [
  { id: '01-basic', label: '01 · Basic', Component: Basic },
  { id: '02-tree', label: '02 · Tree', Component: TreeDemo },
  { id: '06-fixed-columns', label: '06 · Fixed columns', Component: FixedColumns },
  { id: '07-multi-header', label: '07 · Multi header', Component: MultiHeader },
]

export function App() {
  const [id, setId] = useState(examples[0]!.id)
  const active = examples.find((e) => e.id === id) ?? examples[0]!

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui' }}>
      <nav style={{ width: 200, padding: 16, borderRight: '1px solid #e5e7eb' }}>
        <h3>Demos</h3>
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {examples.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setId(e.id)}
                style={{
                  background: e.id === id ? '#eff6ff' : 'transparent',
                  border: 'none',
                  padding: 8,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {e.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <active.Component />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: main.tsx**

替换 `apps/playground/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import '@draggable-table/theme'

const root = document.getElementById('root')
if (!root) throw new Error('root missing')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: 01-basic.tsx**

```tsx
import { Table } from '@draggable-table/table'

interface Row {
  id: string
  name: string
  age: number
}

const data: Row[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Charlie', age: 35 },
]

export function Basic() {
  return (
    <>
      <h2>Basic table (flat)</h2>
      <Table<Row>
        data={data}
        rowKey="id"
        columns={[
          { key: 'name', title: 'Name', field: 'name', width: 200 },
          { key: 'age', title: 'Age', field: 'age', width: 100 },
        ]}
      />
    </>
  )
}
```

- [ ] **Step 4: 02-tree.tsx**

```tsx
import { Table } from '@draggable-table/table'

interface Node {
  id: string
  name: string
  children?: Node[]
}

const data: Node[] = [
  {
    id: '1',
    name: 'Engineering',
    children: [
      { id: '1-1', name: 'Frontend' },
      {
        id: '1-2',
        name: 'Backend',
        children: [{ id: '1-2-1', name: 'API Team' }],
      },
    ],
  },
  { id: '2', name: 'Design' },
]

export function TreeDemo() {
  return (
    <>
      <h2>Tree (children mode)</h2>
      <Table<Node>
        data={data}
        rowKey="id"
        tree={{ mode: 'children', childrenKey: 'children' }}
        columns={[{ key: 'name', title: 'Name', field: 'name', width: 400 }]}
        defaultExpandedDepth={1}
      />
    </>
  )
}
```

- [ ] **Step 5: 06-fixed-columns.tsx**

```tsx
import { Table } from '@draggable-table/table'

interface Row {
  id: string
  name: string
  a: string
  b: string
  c: string
  d: string
  ops: string
}

const data: Row[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i),
  name: `Row ${i}`,
  a: 'AAA',
  b: 'BBB',
  c: 'CCC',
  d: 'DDD',
  ops: 'edit',
}))

export function FixedColumns() {
  return (
    <>
      <h2>Fixed columns</h2>
      <Table<Row>
        data={data}
        rowKey="id"
        totalWidth={1400}
        columns={[
          { key: 'name', title: 'Name', field: 'name', width: 200, fixed: 'left' },
          { key: 'a', title: 'A', field: 'a', width: 300 },
          { key: 'b', title: 'B', field: 'b', width: 300 },
          { key: 'c', title: 'C', field: 'c', width: 300 },
          { key: 'd', title: 'D', field: 'd', width: 300 },
          { key: 'ops', title: 'Ops', field: 'ops', width: 100, fixed: 'right' },
        ]}
      />
    </>
  )
}
```

- [ ] **Step 6: 07-multi-header.tsx**

```tsx
import { Table } from '@draggable-table/table'

interface Row {
  id: string
  name: string
  age: number
  city: string
  street: string
}

const data: Row[] = [
  { id: '1', name: 'Alice', age: 30, city: 'NY', street: 'Lake Park' },
  { id: '2', name: 'Bob', age: 25, city: 'LA', street: 'Main St' },
]

export function MultiHeader() {
  return (
    <>
      <h2>Multi-level header</h2>
      <Table<Row>
        data={data}
        rowKey="id"
        columns={[
          {
            key: 'personal',
            title: 'Personal',
            children: [
              { key: 'name', title: 'Name', field: 'name', width: 150 },
              { key: 'age', title: 'Age', field: 'age', width: 80 },
            ],
          },
          {
            key: 'address',
            title: 'Address',
            children: [
              { key: 'city', title: 'City', field: 'city', width: 100 },
              { key: 'street', title: 'Street', field: 'street', width: 200 },
            ],
          },
        ]}
      />
    </>
  )
}
```

- [ ] **Step 7: 启动 playground 验证**

Run: `pnpm dev`
访问 http://localhost:5173
Expected:
- 01 Basic：显示 3 行简单表格
- 02 Tree：显示树形，展开箭头能点，能收/展
- 06 Fixed columns：横向滚动时 name 和 ops 固定
- 07 Multi header：Personal 和 Address 是两个 group 表头

- [ ] **Step 8: 提交**

```bash
git add apps/playground/src
git commit -m "feat(playground): demos 01, 02, 06, 07"
```

---

## Task 11: 全量验证

- [ ] **Step 1: lint / typecheck / test / build**

```
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
Expected: 全绿。

- [ ] **Step 2: 手工验证 playground**

Run: `pnpm dev`
- 展开 A 行 → A1 出现
- 收起 A 行 → A1 消失
- 06 demo 横向滚动 → name 列和 ops 列保持可见（M2 里因为 body 尚未虚拟滚动，横向滚动通过 viewport overflow 完成）

---

## Acceptance Criteria (from spec §19 M2)

- [ ] 1000 行嵌套树能正常展示（无 error，滚动/渲染流畅）
- [ ] 树形展开/收起切换 OK
- [ ] 左右固定列在横向滚动时保持位置正确
- [ ] 多级表头层级正确（分组行 span 与叶子列宽度对齐）
- [ ] `useTable` hook 单独使用能拿到 `visibleRows`

---

## Self-Review Notes

**Coverage vs spec §19 M2**:
- Table 组件骨架 + useTable ✓ Task 3/8
- Header + Body + Row + Cell ✓ Task 4/5/7
- 树形展开（受控 + 非受控 + defaultExpandedDepth）✓ Task 3/8
- 固定列（sticky pane 三层布局）✓ Task 6（M2 用 absolute，M3 切 sticky）
- 多级表头（ColumnDef.children 递归）✓ Task 5
- 基础 CSS（theme 包完整覆盖）✓ Task 9
- Playground demo 01/02/06/07 ✓ Task 10

**Cross-cutting reminders relevant to M2**:
- position: sticky 不嵌 absolute（M2 fixed pane 用 absolute + top:0/bottom:0；M3 sticky 是独立 pane 且不嵌套虚拟行内）
- React 19 ref as prop（M2 不需要 ref；M6 引入 TableHandle 时用）
- `useTransition` 只在 sort/filter 触发时用（M4 引入）
- `computeVisibleRows` memoize（core 已确保；`useMemo` on model + expanded 是 React 层的复用）

**Deferred to later milestones**:
- 虚拟滚动 → M3
- 拖拽视觉 + 交互 → M5
- 选择、详情面板 → M6
