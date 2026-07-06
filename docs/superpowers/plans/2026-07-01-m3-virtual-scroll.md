# M3: 虚拟滚动 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 10 万行数据流畅滚动。行虚拟滚动 + 固定列 pane 同步 + 支持声明式函数行高。

**Architecture:** 在 M2 的 Body 之上，加一层 viewport（overflow: auto）+ spacer（height=totalHeight, position: relative）+ 每行 absolute + translate3d。固定列 pane 从相同的 `visibleRange` 派生独立渲染，通过 `scrollTop` 事件同步位置。声明式行高通过 `virtual.rowHeight` 传入。

**Tech Stack:** React 19, core 的 computeVisibleRange / prefixSum

**Spec reference:** [`../specs/2026-07-01-draggable-table-design.md`](../specs/2026-07-01-draggable-table-design.md) §12, §19 M3

---

## File Structure

```
packages/table/src/
├── hooks/
│   ├── useVirtualizer.ts     scrollTop 状态 + 可见区间派生
│   └── useScrollSync.ts      fixed pane <-> viewport 同步
├── components/
│   ├── Body/
│   │   ├── VirtualBody.tsx   替换/包裹 Body：spacer + absolute rows
│   │   └── Body.tsx          （M2）保留作为 "无虚拟" fallback
│   └── FixedPane/
│       ├── FixedLeftPane.tsx （修改：接 visibleRange + scrollTop）
│       └── FixedRightPane.tsx
└── utils/
    └── ssr.ts                useIsomorphicLayoutEffect

apps/playground/src/examples/
└── 05-virtual-100k.tsx
```

---

## Task 1: SSR 兼容工具

**Files:**

- Create: `packages/table/src/utils/ssr.ts`

- [ ] **Step 1: 实现**

```ts
import { useEffect, useLayoutEffect } from 'react'

export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export const isBrowser = typeof window !== 'undefined'
```

- [ ] **Step 2: 提交**

```bash
git add packages/table/src/utils/ssr.ts
git commit -m "chore(table): add SSR-safe layout effect"
```

---

## Task 2: useVirtualizer hook

**Files:**

- Create: `packages/table/src/hooks/useVirtualizer.ts`
- Create: `packages/table/tests/hooks/useVirtualizer.test.tsx`

- [ ] **Step 1: 测试**

```tsx
import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVirtualizer } from '../../src/hooks/useVirtualizer.js'

describe('useVirtualizer', () => {
  it('returns initial visible range for scrollTop=0', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ key: i }))
    const { result } = renderHook(() =>
      useVirtualizer({
        count: rows.length,
        viewportHeight: 400,
        rowHeight: 40,
        overscan: 0,
      }),
    )
    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(9)
    expect(result.current.totalHeight).toBe(4000)
  })

  it('updates range when setScrollTop is called', () => {
    const { result } = renderHook(() =>
      useVirtualizer({
        count: 100,
        viewportHeight: 400,
        rowHeight: 40,
        overscan: 0,
      }),
    )
    act(() => result.current.setScrollTop(200))
    expect(result.current.startIndex).toBe(5)
  })

  it('supports function-based row heights', () => {
    const { result } = renderHook(() =>
      useVirtualizer({
        count: 5,
        viewportHeight: 100,
        rowHeight: (i) => (i === 0 ? 80 : 20),
        overscan: 0,
      }),
    )
    expect(result.current.totalHeight).toBe(80 + 4 * 20)
    expect(result.current.getOffset(0)).toBe(0)
    expect(result.current.getOffset(1)).toBe(80)
    expect(result.current.getHeight(1)).toBe(20)
  })

  it('overscan expands range', () => {
    const { result } = renderHook(() =>
      useVirtualizer({
        count: 100,
        viewportHeight: 400,
        rowHeight: 40,
        overscan: 5,
      }),
    )
    act(() => result.current.setScrollTop(400))
    // visible 10..19, overscan 5..24
    expect(result.current.startIndex).toBe(5)
    expect(result.current.endIndex).toBe(24)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @draggable-table/table test tests/hooks/useVirtualizer.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/table/src/hooks/useVirtualizer.ts`:

```ts
import { useMemo, useState } from 'react'
import { computeVisibleRange } from '@draggable-table/core'

export interface UseVirtualizerOptions {
  count: number
  viewportHeight: number
  rowHeight: number | ((index: number) => number)
  overscan?: number
}

export interface VirtualizerState {
  startIndex: number
  endIndex: number
  totalHeight: number
  offsets: readonly number[]
  scrollTop: number
  setScrollTop: (value: number) => void
  getOffset: (index: number) => number
  getHeight: (index: number) => number
}

export function useVirtualizer(options: UseVirtualizerOptions): VirtualizerState {
  const { count, viewportHeight, rowHeight, overscan = 5 } = options
  const [scrollTop, setScrollTop] = useState(0)

  const rowHeights = useMemo(() => {
    if (typeof rowHeight === 'number') return Array.from({ length: count }, () => rowHeight)
    return Array.from({ length: count }, (_, i) => rowHeight(i))
  }, [count, rowHeight])

  const range = useMemo(
    () =>
      computeVisibleRange({
        scrollTop,
        viewportHeight,
        rowHeights,
        overscan,
      }),
    [scrollTop, viewportHeight, rowHeights, overscan],
  )

  return {
    startIndex: range.startIndex,
    endIndex: range.endIndex,
    totalHeight: range.totalHeight,
    offsets: range.offsets,
    scrollTop,
    setScrollTop,
    getOffset: (i) => range.offsets[i] ?? 0,
    getHeight: (i) => rowHeights[i] ?? 0,
  }
}
```

- [ ] **Step 4: 通过 + 提交**

Run: `pnpm --filter @draggable-table/table test tests/hooks/useVirtualizer.test.tsx`
Expected: PASS。

```bash
git add packages/table/src/hooks/useVirtualizer.ts packages/table/tests/hooks/useVirtualizer.test.tsx
git commit -m "feat(table): useVirtualizer hook wrapping core computeVisibleRange"
```

---

## Task 3: VirtualBody 组件

**Files:**

- Create: `packages/table/src/components/Body/VirtualBody.tsx`

- [ ] **Step 1: 实现**

```tsx
import type { CSSProperties, RefObject } from 'react'
import type { InternalRow, ResolvedColumn, RowKey } from '@draggable-table/core'
import { Row } from './Row.js'

export interface VirtualBodyProps<T> {
  rows: readonly InternalRow<T>[]
  columns: readonly ResolvedColumn<T>[]
  expanded: ReadonlySet<RowKey>
  onToggleExpand: (key: RowKey) => void
  startIndex: number
  endIndex: number
  totalHeight: number
  getOffset: (index: number) => number
  getHeight: (index: number) => number
  scrollRef?: RefObject<HTMLDivElement | null>
  onScroll?: (scrollTop: number, scrollLeft: number) => void
  viewportHeight: number
}

export function VirtualBody<T>({
  rows,
  columns,
  expanded,
  onToggleExpand,
  startIndex,
  endIndex,
  totalHeight,
  getOffset,
  getHeight,
  scrollRef,
  onScroll,
  viewportHeight,
}: VirtualBodyProps<T>) {
  const visible = rows.slice(startIndex, endIndex + 1)

  const spacerStyle: CSSProperties = {
    height: totalHeight,
    position: 'relative',
    minWidth: '100%',
  }

  return (
    <div
      className="dt-viewport"
      style={{ height: viewportHeight, overflow: 'auto' }}
      ref={scrollRef}
      onScroll={(e) => {
        const t = e.currentTarget
        onScroll?.(t.scrollTop, t.scrollLeft)
      }}
    >
      <div className="dt-body-scroller" style={spacerStyle} role="rowgroup">
        {visible.map((row, i) => {
          const absoluteIndex = startIndex + i
          const rowStyle: CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: getHeight(absoluteIndex),
            transform: `translate3d(0, ${getOffset(absoluteIndex)}px, 0)`,
          }
          return (
            <div key={String(row.key)} style={rowStyle}>
              <Row
                row={row}
                columns={columns}
                rowIndex={absoluteIndex}
                expanded={expanded.has(row.key)}
                onToggleExpand={onToggleExpand}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add packages/table/src/components/Body/VirtualBody.tsx
git commit -m "feat(table): VirtualBody with translate3d row positioning"
```

---

## Task 4: 更新 FixedLeftPane / FixedRightPane 支持虚拟化

**Files:**

- Modify: `packages/table/src/components/FixedPane/FixedLeftPane.tsx`
- Modify: `packages/table/src/components/FixedPane/FixedRightPane.tsx`

- [ ] **Step 1: FixedLeftPane 支持虚拟化 + scrollTop**

替换 `packages/table/src/components/FixedPane/FixedLeftPane.tsx` 全文:

```tsx
import type { InternalRow, ResolvedColumn, RowKey } from '@draggable-table/core'
import { Row } from '../Body/Row.js'

export interface FixedLeftPaneProps<T> {
  rows: readonly InternalRow<T>[]
  columns: readonly ResolvedColumn<T>[]
  expanded: ReadonlySet<RowKey>
  onToggleExpand: (key: RowKey) => void
  virtualized: boolean
  startIndex: number
  endIndex: number
  totalHeight: number
  scrollTop: number
  viewportHeight: number
  headerHeight: number
  getOffset: (index: number) => number
  getHeight: (index: number) => number
}

export function FixedLeftPane<T>({
  rows,
  columns,
  expanded,
  onToggleExpand,
  virtualized,
  startIndex,
  endIndex,
  totalHeight,
  scrollTop,
  viewportHeight,
  headerHeight,
  getOffset,
  getHeight,
}: FixedLeftPaneProps<T>) {
  if (columns.length === 0) return null
  const width = columns.reduce((sum, c) => sum + c.computedWidth, 0)

  if (!virtualized) {
    return (
      <div className="dt-fixed-left-pane" style={{ width, top: headerHeight }}>
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

  const visible = rows.slice(startIndex, endIndex + 1)

  return (
    <div
      className="dt-fixed-left-pane dt-fixed-left-pane--virtual"
      style={{
        width,
        top: headerHeight,
        height: viewportHeight,
        overflow: 'hidden',
      }}
      aria-hidden="false"
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          transform: `translate3d(0, ${-scrollTop}px, 0)`,
        }}
      >
        {visible.map((row, i) => {
          const absoluteIndex = startIndex + i
          return (
            <div
              key={String(row.key)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: getHeight(absoluteIndex),
                transform: `translate3d(0, ${getOffset(absoluteIndex)}px, 0)`,
              }}
            >
              <Row
                row={row}
                columns={columns}
                rowIndex={absoluteIndex}
                expanded={expanded.has(row.key)}
                onToggleExpand={onToggleExpand}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: FixedRightPane 同样修改**

替换 `packages/table/src/components/FixedPane/FixedRightPane.tsx` 全文（结构与 Left 相同，只改 className 前缀）：

```tsx
import type { InternalRow, ResolvedColumn, RowKey } from '@draggable-table/core'
import { Row } from '../Body/Row.js'

export interface FixedRightPaneProps<T> {
  rows: readonly InternalRow<T>[]
  columns: readonly ResolvedColumn<T>[]
  expanded: ReadonlySet<RowKey>
  onToggleExpand: (key: RowKey) => void
  virtualized: boolean
  startIndex: number
  endIndex: number
  totalHeight: number
  scrollTop: number
  viewportHeight: number
  headerHeight: number
  getOffset: (index: number) => number
  getHeight: (index: number) => number
}

export function FixedRightPane<T>(props: FixedRightPaneProps<T>) {
  const { columns } = props
  if (columns.length === 0) return null
  const width = columns.reduce((sum, c) => sum + c.computedWidth, 0)

  if (!props.virtualized) {
    return (
      <div className="dt-fixed-right-pane" style={{ width, top: props.headerHeight }}>
        {props.rows.map((row, i) => (
          <Row
            key={String(row.key)}
            row={row}
            columns={columns}
            rowIndex={i}
            expanded={props.expanded.has(row.key)}
            onToggleExpand={props.onToggleExpand}
          />
        ))}
      </div>
    )
  }

  const visible = props.rows.slice(props.startIndex, props.endIndex + 1)

  return (
    <div
      className="dt-fixed-right-pane dt-fixed-right-pane--virtual"
      style={{
        width,
        top: props.headerHeight,
        height: props.viewportHeight,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: props.totalHeight,
          position: 'relative',
          transform: `translate3d(0, ${-props.scrollTop}px, 0)`,
        }}
      >
        {visible.map((row, i) => {
          const absoluteIndex = props.startIndex + i
          return (
            <div
              key={String(row.key)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: props.getHeight(absoluteIndex),
                transform: `translate3d(0, ${props.getOffset(absoluteIndex)}px, 0)`,
              }}
            >
              <Row
                row={row}
                columns={columns}
                rowIndex={absoluteIndex}
                expanded={props.expanded.has(row.key)}
                onToggleExpand={props.onToggleExpand}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add packages/table/src/components/FixedPane
git commit -m "feat(table): fixed panes support virtual scrolling"
```

---

## Task 5: Table 集成 virtual

**Files:**

- Modify: `packages/table/src/Table.tsx`

- [ ] **Step 1: 更新 Table 组件加入 virtual 支持**

替换 `packages/table/src/Table.tsx` 全文:

```tsx
import { useMemo, useRef, useState } from 'react'
import type { ColumnDef, DataSource, RowKey } from '@draggable-table/core'
import { useTable } from './hooks/useTable.js'
import { useVirtualizer } from './hooks/useVirtualizer.js'
import { useIsomorphicLayoutEffect } from './utils/ssr.js'
import { HeaderGroup } from './components/Header/HeaderGroup.js'
import { Body } from './components/Body/Body.js'
import { VirtualBody } from './components/Body/VirtualBody.js'
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

  virtual?:
    | boolean
    | {
        rowHeight?: number | ((row: { index: number }) => number)
        overscan?: number
      }
  height?: number // required when virtual=true
}

const DEFAULT_ROW_HEIGHT = 40

export function Table<T>(props: TableProps<T>) {
  const { columns: userColumns, virtual, height } = props

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

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef<HTMLDivElement | null>(null)

  useIsomorphicLayoutEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight)
  }, [columns])

  const virtualized = Boolean(virtual)
  const virtualOptions = typeof virtual === 'object' ? virtual : {}
  const rowHeight = virtualOptions.rowHeight ?? DEFAULT_ROW_HEIGHT
  const overscan = virtualOptions.overscan ?? 5
  const viewportHeight = height ?? 400

  const virt = useVirtualizer({
    count: virtualized ? visibleRows.length : 0,
    viewportHeight: viewportHeight - headerHeight,
    rowHeight:
      typeof rowHeight === 'function'
        ? (i) => (rowHeight as (arg: { index: number }) => number)({ index: i })
        : rowHeight,
    overscan,
  })

  return (
    <div
      className="dt-table"
      role="grid"
      style={{ position: 'relative', width: totalWidth, height: viewportHeight }}
    >
      <div ref={headerRef}>
        <HeaderGroup columns={userColumns} resolved={centerColumns} />
      </div>
      {virtualized ? (
        <VirtualBody
          rows={visibleRows}
          columns={centerColumns}
          expanded={state.expanded}
          onToggleExpand={actions.toggleExpand}
          startIndex={virt.startIndex}
          endIndex={virt.endIndex}
          totalHeight={virt.totalHeight}
          getOffset={virt.getOffset}
          getHeight={virt.getHeight}
          scrollRef={scrollRef}
          onScroll={(top, left) => {
            virt.setScrollTop(top)
            setScrollLeft(left)
          }}
          viewportHeight={viewportHeight - headerHeight}
        />
      ) : (
        <Body
          rows={visibleRows}
          columns={centerColumns}
          expanded={state.expanded}
          onToggleExpand={actions.toggleExpand}
        />
      )}
      <FixedLeftPane
        rows={visibleRows}
        columns={leftFixed}
        expanded={state.expanded}
        onToggleExpand={actions.toggleExpand}
        virtualized={virtualized}
        startIndex={virt.startIndex}
        endIndex={virt.endIndex}
        totalHeight={virt.totalHeight}
        scrollTop={virt.scrollTop}
        viewportHeight={viewportHeight - headerHeight}
        headerHeight={headerHeight}
        getOffset={virt.getOffset}
        getHeight={virt.getHeight}
      />
      <FixedRightPane
        rows={visibleRows}
        columns={rightFixed}
        expanded={state.expanded}
        onToggleExpand={actions.toggleExpand}
        virtualized={virtualized}
        startIndex={virt.startIndex}
        endIndex={virt.endIndex}
        totalHeight={virt.totalHeight}
        scrollTop={virt.scrollTop}
        viewportHeight={viewportHeight - headerHeight}
        headerHeight={headerHeight}
        getOffset={virt.getOffset}
        getHeight={virt.getHeight}
      />
    </div>
  )
}
```

- [ ] **Step 2: 类型检查 + 测试**

Run: `pnpm --filter @draggable-table/table typecheck && pnpm --filter @draggable-table/table test`
Expected: PASS。M2 的测试仍然通过（未开启 virtual 时行为不变）。

- [ ] **Step 3: 提交**

```bash
git add packages/table/src/Table.tsx
git commit -m "feat(table): integrate virtualization into <Table>"
```

---

## Task 6: Playground demo 05-virtual-100k

**Files:**

- Create: `apps/playground/src/examples/05-virtual-100k.tsx`
- Modify: `apps/playground/src/App.tsx`
- Create: `apps/playground/src/data/mock.ts`

- [ ] **Step 1: mock 数据**

`apps/playground/src/data/mock.ts`:

```ts
export interface MockRow {
  id: number
  name: string
  age: number
  city: string
  status: 'active' | 'inactive'
}

const cities = ['New York', 'London', 'Tokyo', 'Paris', 'Berlin']

export function generateFlat(count: number): MockRow[] {
  const out: MockRow[] = new Array(count)
  for (let i = 0; i < count; i++) {
    out[i] = {
      id: i,
      name: `Row ${i}`,
      age: 20 + (i % 40),
      city: cities[i % cities.length] as string,
      status: i % 2 === 0 ? 'active' : 'inactive',
    }
  }
  return out
}
```

- [ ] **Step 2: 05-virtual-100k demo**

```tsx
import { useMemo, useState } from 'react'
import { Table } from '@draggable-table/table'
import { generateFlat, type MockRow } from '../data/mock.js'

const sizes = [100, 1_000, 10_000, 100_000] as const

export function Virtual100k() {
  const [count, setCount] = useState<(typeof sizes)[number]>(10_000)
  const data = useMemo(() => generateFlat(count), [count])

  return (
    <>
      <h2>Virtual scrolling</h2>
      <div style={{ marginBottom: 12 }}>
        Size:{' '}
        {sizes.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCount(n)}
            style={{
              marginRight: 8,
              background: n === count ? '#eff6ff' : 'white',
              border: '1px solid #e5e7eb',
              padding: '4px 12px',
              cursor: 'pointer',
            }}
          >
            {n.toLocaleString()}
          </button>
        ))}
      </div>
      <Table<MockRow>
        data={data}
        rowKey="id"
        virtual
        height={600}
        columns={[
          { key: 'id', title: 'ID', field: 'id', width: 100 },
          { key: 'name', title: 'Name', field: 'name', width: 200 },
          { key: 'age', title: 'Age', field: 'age', width: 100 },
          { key: 'city', title: 'City', field: 'city', width: 200 },
          { key: 'status', title: 'Status', field: 'status', width: 120 },
        ]}
      />
    </>
  )
}
```

- [ ] **Step 3: 加入路由**

修改 `apps/playground/src/App.tsx`，导入并加入 examples 数组：

```tsx
import { Virtual100k } from './examples/05-virtual-100k.js'

const examples = [
  { id: '01-basic', label: '01 · Basic', Component: Basic },
  { id: '02-tree', label: '02 · Tree', Component: TreeDemo },
  { id: '05-virtual-100k', label: '05 · Virtual 100k', Component: Virtual100k },
  { id: '06-fixed-columns', label: '06 · Fixed columns', Component: FixedColumns },
  { id: '07-multi-header', label: '07 · Multi header', Component: MultiHeader },
]
```

- [ ] **Step 4: 手工验证**

Run: `pnpm dev`

- 打开 05-virtual-100k demo
- 切到 100,000 行
- 滚动应该流畅（Chrome DevTools Performance 面板检查 fps ≥55）
- 首次渲染 < 100ms（React DevTools Profiler 验证）

- [ ] **Step 5: 提交**

```bash
git add apps/playground/src/data apps/playground/src/examples/05-virtual-100k.tsx apps/playground/src/App.tsx
git commit -m "feat(playground): virtual scrolling demo with 100k rows"
```

---

## Task 7: 全量验证

- [ ] **Step 1: lint / typecheck / test / build**

```
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

- [ ] **Step 2: 性能验证（Chrome DevTools）**

打开 http://localhost:5173 → 05-virtual-100k

- Performance 面板 record 5 秒滚动 → fps ≥ 55
- React Profiler measure 初次渲染 → < 100ms

若不达标：

- 检查 rowHeights useMemo 依赖是否稳定（`rowHeight` 若是函数，业务方需 useCallback）
- 检查 visibleRows 是否被无谓重算（用 React DevTools 观察 useTable 内 useMemo）

---

## Acceptance Criteria (from spec §19 M3)

- [ ] 10 万行数据首次渲染 < 100ms
- [ ] 快速滚动帧率 ≥ 55fps（Chrome Performance 验证）
- [ ] 声明式函数行高：不同 row 类型返回不同高度时布局正确（手工测试）
- [ ] 固定列 pane 在滚动时位置与主 viewport 同步（视觉验证）

---

## Self-Review Notes

**Coverage vs spec §12 + §19 M3**:

- useVirtualizer 集成 core/computeVirtualRange ✓ Task 2
- DOM 层：viewport + spacer + absolute + translate3d ✓ Task 3
- overscan（默认 5）✓ Task 2/5
- 声明式函数行高 ✓ Task 2/5
- 固定列 pane 与主 viewport 滚动同步 ✓ Task 4（通过 scrollTop 传参而非 sticky）

**Cross-cutting reminders applied**:

- translate3d 而非 top ✓ Task 3/4
- overscan 默认 5 ✓
- 不在虚拟行内嵌 sticky（固定列是独立 pane，通过 scrollTop 派生位置）✓

**Deferred**:

- 拖拽 × 虚拟滚动兼容 → M5
- 测量式动态行高 → v2
