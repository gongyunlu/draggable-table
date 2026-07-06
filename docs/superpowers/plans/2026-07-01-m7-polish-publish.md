# M7: 打磨 + 文档 + 发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 docs 全部页面（guide + api + examples via iframe embed）+ 性能基线 CI + 类型 review + README + Changelog + 第一次 npm publish（@draggable-table/core, table, theme）。

**Architecture:** Docs 保留 VitePress。Examples 页面通过 iframe embed playground URL，playground 是独立的 dev server。CI 加 bench step 记录性能到 `.github/perf-baseline.json`（M3/M5 的 perf 已存在，只是把结果 dump 到文件）。Changesets 已在 M0 配置好，M7 只是走一遍 workflow。

**Tech Stack:** VitePress, Changesets, GitHub Actions (release workflow)

**Spec reference:** [`../specs/2026-07-01-draggable-table-design.md`](../specs/2026-07-01-draggable-table-design.md) §19 M7, §16 (build & dist)

---

## File Structure

```
apps/docs/
├── guide/
│   ├── intro.md
│   ├── quick-start.md
│   ├── tree-mode.md
│   ├── drag-drop.md
│   ├── virtual-scroll.md
│   ├── server-mode.md
│   ├── custom-cell.md
│   ├── headless.md
│   └── theming.md
├── api/
│   ├── table.md
│   ├── use-table.md
│   ├── column-def.md
│   ├── data-source.md
│   ├── drop-ctx.md
│   └── table-handle.md
├── examples/
│   ├── basic.md
│   ├── tree.md
│   ├── drag-row.md
│   ├── drag-column.md
│   ├── virtual-100k.md
│   ├── fixed-columns.md
│   ├── multi-header.md
│   ├── server-side.md
│   └── infinite-scroll.md
├── .vitepress/
│   ├── config.ts                       （更新 sidebar）
│   └── theme/
│       └── DemoEmbed.vue                iframe 嵌入组件
└── index.md

.github/
├── workflows/
│   ├── ci.yml                          （加 bench + e2e）
│   └── release.yml                     （Changesets action）
└── perf-baseline.json                  性能基线

packages/*/README.md                    每包 README
README.md                               根 README
```

---

## Task 1: 每个包写 README

**Files:**

- Create: `packages/core/README.md`
- Create: `packages/table/README.md`
- Create: `packages/theme/README.md`
- Create: `README.md` (根)

- [ ] **Step 1: 根 README**

````markdown
# @draggable-table

**A high-performance draggable tree table for React 19+.**

- **Tree data** — nested (`children`) or flat (`parentId`) formats
- **Drag & drop** — row (same-level + cross-level: before/after/inside), column reorder, column resize
- **Virtual scrolling** — 100k+ rows at 60fps
- **Headless + default UI** — configure via props or drop down to `useTable()`
- **React 19 native** — ref-as-prop, useTransition, no forwardRef

## Install

```bash
pnpm add @draggable-table/table @draggable-table/theme
```
````

## Quick start

```tsx
import { Table } from '@draggable-table/table'
import '@draggable-table/theme'

;<Table
  data={rows}
  rowKey="id"
  columns={[
    { key: 'name', title: 'Name', field: 'name' },
    { key: 'age', title: 'Age', field: 'age', sortable: true },
  ]}
/>
```

Full docs: https://draggable-table.example.com

## Packages

- [`@draggable-table/core`](./packages/core) — Pure TypeScript engine, zero dependencies
- [`@draggable-table/table`](./packages/table) — React 19 components + hooks
- [`@draggable-table/theme`](./packages/theme) — Default CSS

## License

MIT

````

- [ ] **Step 2: packages/core/README.md**

```markdown
# @draggable-table/core

Pure TypeScript engine for `@draggable-table`. Zero runtime dependencies.

## Exports

- `DataModel` / `normalize` — data source normalization
- `computeVisibleRows` — sort/filter/expand pipeline
- `computeVisibleRange`, `buildPrefixSum` — virtualization math
- `resolveColumns`, `distributeWidths` — column layout
- `computeDropTarget`, `wouldCreateCycle` — DnD hit-testing
- `applyDrop` — immutable data update after drag
- `toCsv` — CSV export

See [../table](../table) for the React component built on top.
````

- [ ] **Step 3: packages/table/README.md**

````markdown
# @draggable-table/table

React 19+ draggable tree table.

## Peer dependencies

- `react` >= 19
- `react-dom` >= 19

## Install

```bash
pnpm add @draggable-table/table @draggable-table/theme
```
````

## Basic

```tsx
import { Table } from '@draggable-table/table'
import '@draggable-table/theme'

;<Table data={rows} rowKey="id" columns={[{ key: 'name', title: 'Name', field: 'name' }]} />
```

## Headless

```tsx
import { useTable } from '@draggable-table/table'

const { visibleRows, columns, state, actions } = useTable({ data, rowKey, columns })
// render your own UI
```

````

- [ ] **Step 4: packages/theme/README.md**

```markdown
# @draggable-table/theme

Default CSS for `@draggable-table`.

## Usage

```ts
import '@draggable-table/theme'
````

## Customize via CSS variables

```css
:root {
  --dt-border-color: #d1d5db;
  --dt-row-hover-bg: #eff6ff;
  --dt-drop-indicator: #3b82f6;
  --dt-drop-inside-bg: rgba(59, 130, 246, 0.14);
}
```

See `src/vars.css` for the full list.

````

- [ ] **Step 5: 提交**

```bash
git add README.md packages/core/README.md packages/table/README.md packages/theme/README.md
git commit -m "docs: add package READMEs"
````

---

## Task 2: 文档 guide 页面

**Files:**

- Modify: `apps/docs/guide/intro.md`
- Create: `apps/docs/guide/quick-start.md`
- Create: `apps/docs/guide/tree-mode.md`
- Create: `apps/docs/guide/drag-drop.md`
- Create: `apps/docs/guide/virtual-scroll.md`
- Create: `apps/docs/guide/server-mode.md`
- Create: `apps/docs/guide/custom-cell.md`
- Create: `apps/docs/guide/headless.md`
- Create: `apps/docs/guide/theming.md`

- [ ] **Step 1: intro.md**

```markdown
# Introduction

`@draggable-table` is a high-performance, React 19-native tree table with drag & drop and virtual scrolling.

## Design principles

1. **Tree + drag + virtual scroll — all at once**. No feature disables another.
2. **Two-layer API**. `<Table>` for 80% of use cases; `useTable()` for full custom UI.
3. **Zero-dep core**. `@draggable-table/core` is pure TypeScript, runnable in Node/Worker.
4. **Immutable updates**. Library never mutates your data.

## Next

- [Quick start](./quick-start)
- [Tree mode](./tree-mode)
- [Drag & drop](./drag-drop)
```

- [ ] **Step 2: quick-start.md**

````markdown
# Quick start

## Install

```bash
pnpm add @draggable-table/table @draggable-table/theme
# react 19+ is a peerDep
```
````

## Minimal example

```tsx
import { Table } from '@draggable-table/table'
import '@draggable-table/theme'

const data = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
]

export function MyTable() {
  return (
    <Table
      data={data}
      rowKey="id"
      columns={[
        { key: 'name', title: 'Name', field: 'name' },
        { key: 'age', title: 'Age', field: 'age', sortable: true },
      ]}
    />
  )
}
```

<DemoEmbed src="/playground/#01-basic" />
```

- [ ] **Step 3: tree-mode.md**

````markdown
# Tree mode

`@draggable-table` supports two shapes of tree data.

## Nested (`children`)

```tsx
<Table
  data={data}
  rowKey="id"
  tree={{ mode: 'children', childrenKey: 'children' }}
  columns={[...]}
/>
```
````

## Flat (`parentId`)

```tsx
<Table
  data={data}
  rowKey="id"
  tree={{ mode: 'parent', parentKey: 'parentId' }}
  columns={[...]}
/>
```

## Expand control

```tsx
// Uncontrolled
<Table defaultExpandedKeys={['1']} />
<Table defaultExpandedDepth={1} />

// Controlled
<Table expandedKeys={keys} onExpand={setKeys} />
```

## Lazy loading

```tsx
<Table loadChildren={async (row) => await fetchChildren(row.id)} />
```

<DemoEmbed src="/playground/#02-tree" />
```

- [ ] **Step 4: drag-drop.md**

````markdown
# Drag & drop

## Row drag

```tsx
import { applyDrop } from '@draggable-table/core'

;<Table
  draggable={{ rows: true }}
  onDragEnd={(ctx) => {
    setData(applyDrop(data, ctx, { rowKey: 'id', tree }))
  }}
/>
```
````

## Drop positions

- **before**: insert as prev sibling of target
- **after**: insert as next sibling
- **inside**: become target's child (only when target has children, or `allowInsideLeaf: true`)

## Validation

```tsx
<Table
  allowDrop={(ctx) => ctx.newParentKey !== 'read-only-folder'}
  beforeDrop={async (ctx) => await confirm('Move this item?')}
/>
```

Return `false` to cancel.

## Column drag & resize

```tsx
<Table
  draggable={{ columns: true }}
  columns={[{ key: 'name', title: 'Name', resizable: true, minWidth: 100 }]}
/>
```

<DemoEmbed src="/playground/#03-drag-row" />
```

- [ ] **Step 5: virtual-scroll.md**

````markdown
# Virtual scrolling

```tsx
<Table
  data={largeData}
  rowKey="id"
  virtual
  height={600}
  columns={[...]}
/>
```
````

## Variable row height (declarative)

```tsx
<Table
  virtual={{
    rowHeight: (row) => (row.type === 'group' ? 56 : 40),
    overscan: 5,
  }}
/>
```

## Infinite scroll

```tsx
<Table
  virtual
  infiniteScroll={{
    hasMore: page < totalPages,
    onLoadMore: () => setPage(page + 1),
    threshold: 200,
  }}
/>
```

<DemoEmbed src="/playground/#05-virtual-100k" />
```

- [ ] **Step 6: server-mode.md**

````markdown
# Server mode

```tsx
<Table
  mode="server"
  totalCount={total}
  onRequest={async (params) => {
    const res = await fetch(
      '/api/rows?' +
        new URLSearchParams({
          page: params.page,
          pageSize: params.pageSize,
          sort: JSON.stringify(params.sort),
        }),
    )
    return await res.json() // { rows, total }
  }}
/>
```
````

Sort/filter are not applied locally — they're passed to `onRequest`.
Concurrent requests: only the latest response wins.

<DemoEmbed src="/playground/#08-server-side" />
```

- [ ] **Step 7: custom-cell.md**

````markdown
# Custom cell renderer

```tsx
<Table
  columns={[
    {
      key: 'status',
      title: 'Status',
      field: 'status',
      render: (row, ctx) => (
        <span className={row.status === 'active' ? 'badge-green' : 'badge-red'}>{row.status}</span>
      ),
    },
  ]}
/>
```
````

`ctx` includes: `rowIndex`, `rowKey`, `depth`, `isExpanded`, `isSelected`.

<DemoEmbed src="/playground/#10-custom-cell" />
```

- [ ] **Step 8: headless.md**

````markdown
# Headless mode

Use `useTable()` when you want full control over the UI:

```tsx
import { useTable } from '@draggable-table/table'

const table = useTable({
  data,
  rowKey: 'id',
  columns: [...],
})

return (
  <div>
    {table.visibleRows.map(row => (
      <MyCustomRow key={row.key} data={row.raw} />
    ))}
  </div>
)
```
````

`useTable` returns `{ visibleRows, columns, state, actions, virtualizer, dnd }`.

<DemoEmbed src="/playground/#13-headless" />
```

- [ ] **Step 9: theming.md**

````markdown
# Theming

The library ships CSS variables you can override:

```css
:root {
  --dt-border-color: #e5e7eb;
  --dt-row-hover-bg: rgba(59, 130, 246, 0.04);
  --dt-drop-indicator: #3b82f6;
  --dt-drop-inside-bg: rgba(248, 113, 113, 0.14);
}
```
````

See [full list](https://github.com/gongyunlu/draggable-table/blob/main/packages/theme/src/vars.css).

## Density / borders / stripes

```tsx
<Table density="compact" bordered="grid" striped />
```

## Rewriting styles entirely

Skip `@draggable-table/theme` — write your own CSS targeting `.dt-*` classes.

````

- [ ] **Step 10: 提交**

```bash
git add apps/docs/guide
git commit -m "docs: guide pages"
````

---

## Task 3: 文档 API 页面

**Files:**

- Create: `apps/docs/api/table.md`
- Create: `apps/docs/api/use-table.md`
- Create: `apps/docs/api/column-def.md`
- Create: `apps/docs/api/data-source.md`
- Create: `apps/docs/api/drop-ctx.md`
- Create: `apps/docs/api/table-handle.md`

- [ ] **Step 1: table.md**

```markdown
# `<Table>`

## Props

| Prop                   | Type                                                    | Default                 |
| ---------------------- | ------------------------------------------------------- | ----------------------- |
| `data`                 | `T[]`                                                   | required                |
| `rowKey`               | `keyof T \| (row) => RowKey`                            | required                |
| `tree`                 | `TreeConfig \| undefined`                               | `undefined` (flat list) |
| `columns`              | `ColumnDef<T>[]`                                        | required                |
| `expandedKeys`         | `RowKey[]`                                              | uncontrolled            |
| `defaultExpandedKeys`  | `RowKey[]`                                              | `[]`                    |
| `defaultExpandedDepth` | `number \| 'all'`                                       | `0`                     |
| `onExpand`             | `(keys) => void`                                        |                         |
| `loadChildren`         | `(row) => Promise<T[]>`                                 |                         |
| `selection`            | `{ mode, checkbox?, cascadeParent?, keepAcrossPages? }` |                         |
| `selectedKeys`         | `RowKey[]`                                              | uncontrolled            |
| `defaultSelectedKeys`  | `RowKey[]`                                              | `[]`                    |
| `onSelectionChange`    | `(keys) => void`                                        |                         |
| `draggable`            | `{ rows?, columns?, allowInsideLeaf? }`                 |                         |
| `allowDrop`            | `(ctx) => boolean`                                      |                         |
| `beforeDrop`           | `(ctx) => Promise<boolean>`                             |                         |
| `onDragEnd`            | `(ctx) => void`                                         |                         |
| `sort`                 | `SortState[]`                                           | uncontrolled            |
| `defaultSort`          | `SortState[]`                                           | `[]`                    |
| `onSortChange`         | `(state) => void`                                       |                         |
| `filter`               | `FilterState`                                           | uncontrolled            |
| `defaultFilter`        | `FilterState`                                           | `{}`                    |
| `onFilterChange`       | `(state) => void`                                       |                         |
| `mode`                 | `'client' \| 'server'`                                  | `'client'`              |
| `totalCount`           | `number`                                                | required in server mode |
| `onRequest`            | `(params) => Promise<{rows, total}>`                    |                         |
| `expandableRow`        | `{ render, expandedRowKeys?, defaultExpandedRowKeys? }` |                         |
| `virtual`              | `boolean \| { rowHeight, overscan }`                    | `false`                 |
| `height`               | `number`                                                | `400`                   |
| `infiniteScroll`       | `{ hasMore, onLoadMore, threshold? }`                   |                         |
| `density`              | `'compact' \| 'normal' \| 'loose'`                      | `'normal'`              |
| `bordered`             | `'none' \| 'horizontal' \| 'grid'`                      | `'horizontal'`          |
| `striped`              | `boolean`                                               | `false`                 |
| `loading`              | `boolean`                                               | `false`                 |
| `empty`                | `ReactNode`                                             | `'No data'`             |
| `errorState`           | `ReactNode`                                             |                         |
| `ref`                  | `Ref<TableHandle<T>>`                                   |                         |
```

- [ ] **Step 2: use-table.md**

````markdown
# `useTable(options)`

Same options as `<Table>` props.

## Returns

```ts
{
  visibleRows: InternalRow<T>[]
  columns: ResolvedColumn<T>[]
  state: {
    expanded: Set<RowKey>
    selected: Set<RowKey>
    sort: SortState[]
    filter: FilterState
  }
  actions: {
    toggleExpand: (key: RowKey) => void
    toggleSort: (columnKey: string) => void
    setFilter: (columnKey: string, value: FilterValue) => void
    clearFilter: (columnKey: string) => void
    toggleSelect: (key: RowKey, checked?: boolean) => void
    setColumnWidth: (key: string, width: number) => void
    setExpanded: (keys: RowKey[]) => void
  }
}
```
````

````

- [ ] **Step 3: column-def.md, data-source.md, drop-ctx.md, table-handle.md**

以 spec §10 里的类型定义为准，各写一份对应的 API 文档（每份 30-60 行）。类似上面的结构。

（这一步 vibe coding 时直接复制 spec 里对应 type 定义即可。）

- [ ] **Step 4: 提交**

```bash
git add apps/docs/api
git commit -m "docs: API reference pages"
````

---

## Task 4: 文档 examples 页面（iframe embed）

**Files:**

- Create: `apps/docs/.vitepress/theme/DemoEmbed.vue`
- Create: `apps/docs/.vitepress/theme/index.ts`
- Create: `apps/docs/examples/*.md`

- [ ] **Step 1: DemoEmbed.vue**

```vue
<script setup lang="ts">
defineProps<{ src: string; height?: number }>()
</script>

<template>
  <iframe
    :src="src"
    :style="{
      width: '100%',
      height: (height ?? 500) + 'px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
    }"
    loading="lazy"
    referrerpolicy="no-referrer"
  />
</template>
```

- [ ] **Step 2: 注册组件**

`apps/docs/.vitepress/theme/index.ts`:

```ts
import DefaultTheme from 'vitepress/theme'
import DemoEmbed from './DemoEmbed.vue'
import type { App } from 'vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: App }) {
    app.component('DemoEmbed', DemoEmbed)
  },
}
```

- [ ] **Step 3: 加 vue 依赖**

`apps/docs/package.json` devDependencies 加：

```json
"vue": "^3.5.0"
```

- [ ] **Step 4: 每个 examples/\*.md 一行**

例如 `examples/basic.md`:

```markdown
# Basic

<DemoEmbed src="http://localhost:5173/#01-basic" height="500" />
```

发布时 iframe src 改为 GitHub Pages / production URL。

- [ ] **Step 5: 更新 .vitepress/config.ts sidebar**

```ts
sidebar: {
  '/guide/': [
    { text: 'Introduction', link: '/guide/intro' },
    { text: 'Quick start', link: '/guide/quick-start' },
    { text: 'Tree mode', link: '/guide/tree-mode' },
    { text: 'Drag & drop', link: '/guide/drag-drop' },
    { text: 'Virtual scroll', link: '/guide/virtual-scroll' },
    { text: 'Server mode', link: '/guide/server-mode' },
    { text: 'Custom cell', link: '/guide/custom-cell' },
    { text: 'Headless', link: '/guide/headless' },
    { text: 'Theming', link: '/guide/theming' },
  ],
  '/api/': [
    { text: 'Table', link: '/api/table' },
    { text: 'useTable', link: '/api/use-table' },
    { text: 'ColumnDef', link: '/api/column-def' },
    { text: 'DataSource', link: '/api/data-source' },
    { text: 'DropCtx', link: '/api/drop-ctx' },
    { text: 'TableHandle', link: '/api/table-handle' },
  ],
  '/examples/': [
    { text: 'Basic', link: '/examples/basic' },
    { text: 'Tree', link: '/examples/tree' },
    { text: 'Drag row', link: '/examples/drag-row' },
    { text: 'Drag column', link: '/examples/drag-column' },
    { text: 'Virtual 100k', link: '/examples/virtual-100k' },
    { text: 'Fixed columns', link: '/examples/fixed-columns' },
    { text: 'Multi header', link: '/examples/multi-header' },
    { text: 'Server side', link: '/examples/server-side' },
    { text: 'Infinite scroll', link: '/examples/infinite-scroll' },
  ],
},
nav: [
  { text: 'Guide', link: '/guide/intro' },
  { text: 'API', link: '/api/table' },
  { text: 'Examples', link: '/examples/basic' },
],
```

- [ ] **Step 6: 构建 docs**

Run: `pnpm install && pnpm --filter @draggable-table-app/docs build`
Expected: 无 error，输出到 `apps/docs/.vitepress/dist/`。

- [ ] **Step 7: 提交**

```bash
git add apps/docs
git commit -m "docs: examples pages and iframe embed helper"
```

---

## Task 5: 性能基线 CI

**Files:**

- Create: `.github/perf-baseline.json`
- Modify: `.github/workflows/ci.yml`
- Create: `tests/perf/bench.ts`

- [ ] **Step 1: 简单 bench 脚本（Vitest bench）**

`tests/perf/bench.ts` 由 core / table 包各出一份 bench —— 但为了 M7 简化，我们只把 core 关键函数的执行时间打到一个 JSON。

在 `packages/core/tests/` 加一个 `bench.test.ts`:

```ts
import { bench, describe } from 'vitest'
import { DataModel } from '../src/data-model/DataModel.js'
import { computeVisibleRows } from '../src/state/computeVisibleRows.js'
import { computeVisibleRange } from '../src/virtualizer/computeRange.js'
import { computeDropTarget } from '../src/dnd/hitTest.js'

interface Row {
  id: number
  parentId: number | null
}

// 100k flat rows
const data100k: Row[] = Array.from({ length: 100_000 }, (_, i) => ({ id: i, parentId: null }))

describe('core benches', () => {
  bench('normalize 100k flat', () => {
    DataModel.from<Row>({ data: data100k, rowKey: 'id' })
  })

  const model = DataModel.from<Row>({ data: data100k, rowKey: 'id' })

  bench('computeVisibleRows 100k no sort/filter', () => {
    computeVisibleRows(model, new Set(), [], {})
  })

  bench('computeVisibleRange 100k rows', () => {
    computeVisibleRange({
      scrollTop: 40000,
      viewportHeight: 600,
      rowHeights: Array.from({ length: 100_000 }, () => 40),
      overscan: 5,
    })
  })

  const deepTree = DataModel.from<Row>({
    data: Array.from({ length: 100 }, (_, i) => ({ id: i, parentId: i === 0 ? null : i - 1 })),
    rowKey: 'id',
    tree: { mode: 'parent', parentKey: 'parentId' },
  })

  bench('hitTest 100-deep tree', () => {
    computeDropTarget({
      dragKey: 0,
      pointerY: 100,
      targetKey: 50,
      targetRect: { top: 0, height: 40 },
      model: deepTree,
      expandedKeys: new Set(),
      allowInsideLeaf: false,
    })
  })
})
```

- [ ] **Step 2: 加 script 到 core/package.json**

```json
"bench": "vitest bench --run",
"bench:baseline": "vitest bench --run --reporter=json --outputFile=../../.github/perf-baseline.json"
```

- [ ] **Step 3: 加 bench step 到 CI**

`.github/workflows/ci.yml`（modify）：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm build:apps

  e2e:
    runs-on: ubuntu-latest
    needs: ci
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @draggable-table-test/e2e install-browsers
      - run: pnpm test:e2e

  bench:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: ci
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @draggable-table/core bench:baseline
      - uses: actions/upload-artifact@v4
        with:
          name: perf-baseline
          path: .github/perf-baseline.json
```

- [ ] **Step 4: 提交**

```bash
git add packages/core packages/core/package.json .github/workflows/ci.yml
git commit -m "ci: add e2e and perf baseline steps"
```

---

## Task 6: Release workflow (Changesets)

**Files:**

- Create: `.github/workflows/release.yml`

- [ ] **Step 1: workflow**

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency:
  group: release
  cancel-in-progress: false

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Create release PR or publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          version: pnpm changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: 加 npm publish 前的 build 保证**

Changesets action 需要 `NPM_TOKEN` secret 在 GitHub repo settings 里配置。手工步骤（在 spec 之外）。

- [ ] **Step 3: 提交**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add changesets release workflow"
```

---

## Task 7: 类型 review + JSDoc

**Files:**

- Modify: `packages/core/src/**/*.ts` (加 JSDoc 到公共 API)
- Modify: `packages/table/src/**/*.ts` (同上)

- [ ] **Step 1: 扫描 `any`**

Run: `grep -rn ': any' packages/*/src`
Expected: 无匹配（M1-M6 应已避免）。若有，把 `any` 替换为 `unknown` 或具体类型。

- [ ] **Step 2: 给 public exports 加 JSDoc**

优先给以下加简短 JSDoc（一行 summary 就够）：

- `Table` component
- `useTable` hook
- `TableProps`, `ColumnDef`, `DropCtx`, `TableHandle`
- `applyDrop`, `toCsv`, `DataModel.from`, `computeDropTarget`

举例：

```ts
/**
 * Draggable tree table component. See docs at https://... for full API.
 * @example
 * <Table data={rows} rowKey="id" columns={[...]} />
 */
export function Table<T>(props: TableProps<T>) { ... }
```

- [ ] **Step 3: 构建 + 检查 d.ts**

Run: `pnpm build`
打开 `packages/table/dist/index.d.ts`，抽查是否所有 public 类型都有明确签名（无 `any`）。

- [ ] **Step 4: 提交**

```bash
git add packages/core/src packages/table/src
git commit -m "docs: JSDoc on public API + type review"
```

---

## Task 8: 首次 npm publish

**Files:**

- Modify: `packages/core/package.json` (version 0.1.0)
- Modify: `packages/table/package.json` (version 0.1.0)
- Modify: `packages/theme/package.json` (version 0.1.0)
- Create: `.changeset/initial-release.md`

- [ ] **Step 1: 加 changeset**

`.changeset/initial-release.md`:

```markdown
---
'@draggable-table/core': minor
'@draggable-table/table': minor
'@draggable-table/theme': minor
---

Initial v0.1.0 release. Tree data + row/column drag & drop (before/after/inside) + virtual scrolling (100k rows) + client/server mode + selection + custom renderer + CSS variables theme.
```

- [ ] **Step 2: 生成版本**

Run: `pnpm changeset version`
Expected: 三个包 package.json 更新到 0.1.0；`CHANGELOG.md` 生成。

- [ ] **Step 3: 全量验证**

```
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

- [ ] **Step 4: dry-run 发布验证包内容**

Run: `pnpm --filter @draggable-table/core publish --dry-run`
Expected: 打印将发布的文件列表：dist/index.js、dist/index.cjs、dist/index.d.ts、README.md、package.json。核对没有源码 / node_modules。

同样对 table 和 theme。

- [ ] **Step 5: 从零安装 smoke test**

在临时目录：

```bash
mkdir /tmp/dt-smoke && cd /tmp/dt-smoke
pnpm init
pnpm add react react-dom
# link workspace packages 到当前 mkdir
pnpm link e:/draggable-table/packages/core
pnpm link e:/draggable-table/packages/table
pnpm link e:/draggable-table/packages/theme
```

写 `test.mjs`:

```js
import { Table } from '@draggable-table/table'
console.log('Table imported ok:', typeof Table)
```

Run: `node test.mjs`
Expected: 打印 `Table imported ok: function`。

- [ ] **Step 6: 正式发布（人工确认）**

Run: `pnpm changeset publish`
Expected: 三个包上传到 npm。

（生产环境应通过 GitHub Actions 触发 release.yml，而非本地。这一步是首次发布时的人工确认。）

- [ ] **Step 7: 提交 tag + 推送**

```bash
git add .
git commit -m "release: v0.1.0"
git tag v0.1.0
git push origin main --tags
```

---

## Task 9: 全量验收

- [ ] **Step 1: 从零 npm i 到跑起 basic demo**

在新目录：

```bash
mkdir /tmp/dt-verify && cd /tmp/dt-verify
pnpm init
pnpm add react react-dom @draggable-table/table @draggable-table/theme
```

写 `index.html` + `main.jsx` + vite dev 起来，验证 `<Table>` 能显示。

- [ ] **Step 2: docs 站可访问**

Run: `pnpm --filter @draggable-table-app/docs preview`
浏览器打开显示的 URL：

- 首页 hero
- Guide 各页链接可跳转
- Examples 页面 iframe 加载（在 preview 里，src 可能显示 dev URL；生产要 base 到实际 playground 部署地址）

- [ ] **Step 3: 类型定义无 any**

Run: `grep -rn ': any' packages/*/dist/*.d.ts`
Expected: 无 output（`unknown` 允许）。

---

## Acceptance Criteria (from spec §19 M7)

- [ ] 从零 `npm i @draggable-table/table @draggable-table/theme` 到能跑起 basic demo（Task 9.1 手工验证）
- [ ] Docs 站可访问、所有 examples iframe 加载正常（Task 9.2 手工验证）
- [ ] 类型定义无 `any`（除内部实现细节）（Task 9.3 grep 验证）

---

## Self-Review Notes

**Coverage vs spec §19 M7**:

- Docs 全部页面（guide × 9 + api × 6 + examples × 9）✓ Task 2/3/4
- 性能基线 CI 步骤 ✓ Task 5
- 类型 review（导出的 API 类型都有 JSDoc）✓ Task 7
- README + Changelog（Changesets 产出）✓ Task 1/8
- 第一次 npm publish ✓ Task 8

**Cross-cutting reminders applied**:

- ESM + CJS 双输出（tsdown 已配，dry-run 验证内容）
- d.ts bundle 随包（tsdown dts: true）
- `sideEffects: ["**/*.css"]` for theme（M0 已配）
- CSS 分发独立包（`@draggable-table/theme` 已独立包）
- peerDep `react >= 19.0.0`（M0 已配）

**Deferred to v0.2 及后续**:

- Excel 导出独立子包
- devtools 独立子包
- 测量式动态行高
- 列虚拟滚动
- 分组聚合 / 汇总行
- 完整 WAI-ARIA grid 合规
- RTL / i18n
