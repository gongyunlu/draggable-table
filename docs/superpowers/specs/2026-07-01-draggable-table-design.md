# Draggable Tree Table — Design Spec

- **项目**：`@draggable-table` React 19+ 组件库
- **日期**：2026-07-01
- **作者**：gongyunlu（与 AI 结对）
- **状态**：待实现（v1）
- **交付模式**：Vibe coding（AI 生成代码 + 人工判断/review）

本文件是 v1 的完整设计规约，用作 AI 结对编程时的上下文。每个 milestone 有独立的验收标准，实现时按 M0 → M1 → M2 → (M3 ⇄ M4) → M5 → M6 → M7 顺序展开。

---

## 1. 项目定位

`@draggable-table` 是 React 19+ 生态下的**高性能、可拖拽的树形表格组件库**。定位为通用组件库——不预设业务场景，暴露足够的能力让业务方组合。

**核心承诺**：**树形数据 + 拖拽（含跨层级）+ 虚拟滚动三者能同时工作**，且不存在"选了 A 就得放弃 B"的伪功能。

## 2. Goals

- 树 + 拖拽 + 虚拟滚动三者共存，无组合退化
- Headless 核心 + 内置默认 UI 双层 API（配置驱动为主，`useTable` hook 为底层）
- React 19 一等公民：`ref` as prop、`useTransition`、`useDeferredValue`
- 构建栈：Vite 8（内置 Rolldown）+ tsdown（库打包）+ Oxlint + Prettier + Vitest + Playwright + VitePress
- 基础可访问（正确 ARIA role、键盘可 focus 到行、屏幕阅读器可读表结构）
- SSR 兼容（不依赖 `window` / `document` 直接调用）
- Tree-shakeable、CSS 可选装、按需扩展（Excel 导出等作为 v2 独立子包）

## 3. Non-Goals（v1 明确不做）

- **不做电子表格**：不支持任意选中一片单元格自由合并、公式计算、跨表引用
- **不做 Canvas 渲染**：v1 明确用 DOM 虚拟滚动；Renderer 做成抽象接口，未来可替换
- **不兼容 React 18**：peerDep 锁定 `>= 19.0.0`
- **不做完整 WAI-ARIA grid 合规**：v1 只到"基础可访问"，完整合规放 v2
- **不做单元格键盘导航 / Excel 式复制粘贴 / 行内编辑**：v2
- **不做移动端交互优化**：dnd-kit 天然带触摸支持，但不针对移动端做 UX 优化
- **不做内置 i18n**：文案通过 props 覆写（`empty`、`loadingText` 等）
- **不引入 Immer**：手写不可变 + 结构共享；`core` 保持零外部依赖
- **不做左移跳出层级的拖拽 UX**：X 位置分段隐式交互不做，跨层级只用 target 位置表达

## 4. 功能范围（v1 Feature Scope）

### A. 树形

- 树形数据展示（层级缩进 + 展开箭头）
- 展开状态受控（`expandedKeys`）+ 非受控（`defaultExpandedKeys`）
- 子节点异步懒加载（`loadChildren`）
- 默认展开控制（`defaultExpandedDepth: number | 'all'`）
- 树形 + 虚拟滚动共存
- 父子节点联动选择（勾父 → 勾子；半选态）

### B. 拖拽

- 行拖拽同层
- 行跨层级拖拽（`before` / `after` / `inside` 三点）
- 列拖拽排序
- 列宽拖拽调整
- Drop 视觉反馈（原地无样式 + DragOverlay 悬浮预览 chip + 横线指示 + inside 高亮）
- 虚拟滚动 + 拖拽兼容（含边缘 autoScroll）
- 自定义 drop 校验：同步 `allowDrop` + 异步 `beforeDrop`

### C. 列

- 左/右固定列（sticky pane 三层布局）
- 多级表头（`ColumnDef.children`）
- 列宽拖调（`resizable` + `minWidth` / `maxWidth`）
- 列显隐 API（`ColumnDef.hidden`，不带内置面板）
- 自适应列宽（`width: 'auto' | number | 百分比`、`flex`）

### D. 数据处理

- 单列 / 多列排序（Ctrl+Click 多列）
- 内置筛选面板（enum / text 两种预设，custom 支持自渲染）
- 分页核心逻辑（不带 UI，业务方组合）
- 客户端模式 + 服务端模式（`mode: 'client' | 'server'`，`onRequest`）

### E. 选择与操作

- 单选 / 多选（Ctrl+Click 增选 / Shift+Click 范围选）
- 复选框列（`selection.checkbox`）
- 跨页保留选择（`selection.keepAcrossPages`）
- 行展开为详情面板（`expandableRow`，与树形展开互相独立）

### F. 编辑（v1 仅 cellRenderer）

- `ColumnDef.render(row, ctx) => ReactNode` 支持任意 React 节点
- 业务方可在 renderer 里塞 Input / Select 实现简易编辑（focus / 键盘 / 校验由业务方负责）

### G. 大数据性能

- 行虚拟滚动（`virtual: true | { rowHeight, overscan }`）
- 固定行高 + 声明式函数行高（`rowHeight: number | (row) => number`）
- 无限滚动 / 触底加载（`infiniteScroll: { hasMore, onLoadMore, threshold }`）

### H. 其它

- 状态占位（`empty`、`loading`、`errorState`）
- 样式选项（`density: 'compact' | 'normal' | 'loose'`、`bordered`、`striped`）
- CSS 变量主题（`--dt-*`）
- CSV 导出 hook（`exportCsv(options): string`，返回字符串）
- 基础可访问性（role="grid"、aria-label、键盘 focus 到行）
- SSR 兼容

## 5. v2 及以后规划（明确 later）

- B: 跨表格拖拽
- C: 列显隐面板、rowSpan 数据驱动合并（"同列相邻值相同"简单规则，或非虚拟滚动模式）
- D: 分组聚合、汇总行、数字 / 日期范围筛选
- E: 单元格键盘导航、复制粘贴 TSV、右键菜单
- F: 完整编辑能力
- G: 列虚拟滚动、测量式动态行高、异步懒渲染
- H: Excel 导出（独立子包）、打印、devtools（独立子包）、完整 WAI-ARIA、RTL、i18n

## 6. 技术栈

| 类别         | 选择                                    | 备注                                                    |
| ------------ | --------------------------------------- | ------------------------------------------------------- |
| React        | >= 19.0.0                               | peerDep，锁 19+                                         |
| 构建（应用） | Vite 8（含 Rolldown）                   | playground、docs                                        |
| 构建（库）   | tsdown                                  | core / table / theme 各自 tsdown                        |
| Lint         | Oxlint                                  | 替代 ESLint                                             |
| 格式化       | Prettier                                | oxfmt 覆盖度不足                                        |
| 单元测试     | Vitest                                  | core / table hooks                                      |
| 组件测试     | Vitest + jsdom + @testing-library/react | 不测拖拽                                                |
| E2E          | Playwright                              | 拖拽、虚拟滚动、SSR、a11y                               |
| 文档         | VitePress                               | React demo 通过 iframe embed playground                 |
| DnD 底层     | @dnd-kit/core + @dnd-kit/sortable       | 直接 dep 内置                                           |
| 版本         | Changesets                              | v0.x 宽松、v1 后严格 semver                             |
| CI           | GitHub Actions                          | lint → typecheck → unit → build → e2e → bench → release |
| 环境         | Node ≥ 20 / TS ≥ 5.6 / pnpm ≥ 9         | Vite 8 要求                                             |

## 7. Monorepo 结构

```
draggable-table/
├── packages/
│   ├── core/                  → @draggable-table/core   （纯 TS，无 React、无外部依赖）
│   ├── table/                 → @draggable-table/table  （React 组件 + 默认 UI）
│   └── theme/                 → @draggable-table/theme  （默认 CSS）
├── apps/
│   ├── playground/            开发时 demo（Vite dev）
│   └── docs/                  VitePress 文档站
├── tests/e2e/                 Playwright
├── .changeset/                Changesets
├── .github/workflows/
├── .oxlintrc.json
├── .prettierrc
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

**包依赖关系**：

- `@draggable-table/table` → deps: `@draggable-table/core` (workspace:\*), `@dnd-kit/core`, `@dnd-kit/sortable` ；peerDep: `react >= 19.0.0`
- `@draggable-table/core` → deps: **无**（纯 TS，可在 Node/Worker 里跑）
- `@draggable-table/theme` → deps: **无**（纯 CSS）

## 8. 内部分层

```
业务层（用户代码）
─────────────────────────────
@draggable-table/table
├─ <Table> 组件（配置驱动 API）
├─ useTable() hook（headless API，Table 内部也用它）
└─ DOMRenderer（v1 唯一 Renderer 实现）
─────────────────────────────
@draggable-table/core
├─ DataModel（数据规范化 + flat 内部表示）
├─ StateEngine（sort/filter/expand/select 派生）
├─ Virtualizer（可见行范围计算，纯函数）
└─ DndEngine（hitTest + applyDrop + validate）
─────────────────────────────
外部依赖（React 19 / @dnd-kit/*）
```

**关键设计**：core 里没有一行 React 代码。所有与 React 有关的东西（hook、context、组件）都在 table 层。

**Renderer 抽象**（不算过度设计，本来就是虚拟滚动的自然分层）：

```ts
interface Renderer<T> {
  render(props: RenderProps<T>): ReactNode
  scrollToRow(index: number): void
  getVisibleRange(): [number, number]
  // measureRow?(row: Row): number  // v2 才引入（测量式动态行高）
}

// v1 唯一实现
class DOMRenderer<T> implements Renderer<T> { ... }
```

## 9. 数据模型

### 9.1 外部 API

```ts
type RowKey = string | number

interface DataSource<T> {
  data: T[]
  rowKey: keyof T | ((row: T) => RowKey)
  // 无 tree = 纯列表；有 tree = 树形。可辨识联合类型编译期禁止歧义
  tree?: { mode: 'children'; childrenKey: keyof T } | { mode: 'parent'; parentKey: keyof T }
}
```

**规则**：

- 无 `tree` → 纯列表（无树形）
- `mode: 'children'` → 后端返回的嵌套形态
- `mode: 'parent'` → 扁平 + 父 id 形态
- 类型系统禁止两个都填

### 9.2 内部表示

```ts
interface InternalRow<T> {
  key: RowKey
  raw: T // 原始数据（cellRenderer 时传回）
  parentKey: RowKey | null
  depth: number // 0 = 根
  index: number // 同层顺序索引
  hasChildren: boolean
  childrenLoaded: boolean // 懒加载状态
}

class DataModel<T> {
  rows: InternalRow<T>[] // 全部行（无视展开状态）
  byKey: Map<RowKey, InternalRow<T>> // O(1) 定位
  childrenMap: Map<RowKey | null, RowKey[]> // 父 → 子 key 列表
}
```

### 9.3 规范化

`normalize(source: DataSource<T>): DataModel<T>` 是**纯函数**：

- 扁平列表输入：直接映射，`parentKey = null, depth = 0`
- 嵌套输入（`mode: 'children'`）：深度优先遍历，累积 depth / parent / index
- 扁平 + parentKey：先按 parentKey 建 childrenMap，再深度优先构造 rows 保证父在子前

**字段变化**：库不感知业务方新增/删除字段。字段完全由 `columns` 定义驱动。

## 10. Public API

### 10.1 `<Table />` Props

```ts
interface TableProps<T> {
  // 数据
  data: T[]
  rowKey: keyof T | ((row: T) => RowKey)
  tree?: { mode: 'children'; childrenKey: keyof T } | { mode: 'parent'; parentKey: keyof T }

  // 列
  columns: ColumnDef<T>[]

  // 树形展开
  expandedKeys?: RowKey[] // 受控
  defaultExpandedKeys?: RowKey[] // 非受控
  defaultExpandedDepth?: number | 'all'
  onExpand?: (keys: RowKey[]) => void
  loadChildren?: (row: T) => Promise<T[]>

  // 选择
  selectedKeys?: RowKey[]
  defaultSelectedKeys?: RowKey[]
  selection?: {
    mode: 'single' | 'multiple'
    checkbox?: boolean
    cascadeParent?: boolean // 默认 true
    keepAcrossPages?: boolean
  }
  onSelectionChange?: (keys: RowKey[]) => void

  // 拖拽
  draggable?: {
    rows?: boolean
    columns?: boolean
    allowInsideLeaf?: boolean // 叶子节点是否允许 inside，默认 false
  }
  allowDrop?: (ctx: DropCtx<T>) => boolean // 同步校验
  beforeDrop?: (ctx: DropCtx<T>) => Promise<boolean> // 异步校验
  onDragEnd?: (ctx: DropCtx<T>) => void

  // 数据处理
  sort?: SortState[] // 受控
  defaultSort?: SortState[]
  onSortChange?: (state: SortState[]) => void
  filter?: FilterState
  defaultFilter?: FilterState
  onFilterChange?: (state: FilterState) => void

  // 数据源模式
  mode?: 'client' | 'server'
  totalCount?: number // server 模式必填
  onRequest?: (params: RequestParams) => Promise<{ rows: T[]; total: number; cursor?: unknown }>

  // 详情面板（与树形展开独立）
  expandableRow?: {
    render: (row: T) => ReactNode
    expandedRowKeys?: RowKey[]
    defaultExpandedRowKeys?: RowKey[]
  }

  // 虚拟滚动
  virtual?:
    | boolean
    | {
        rowHeight?: number | ((row: T) => number) // 默认 40
        overscan?: number // 默认 5
      }
  infiniteScroll?: {
    hasMore: boolean
    onLoadMore: () => Promise<void>
    threshold?: number // 默认 200
  }

  // 样式与状态
  density?: 'compact' | 'normal' | 'loose' // 默认 'normal'
  bordered?: 'none' | 'horizontal' | 'grid' // 默认 'horizontal'
  striped?: boolean // 默认 false
  loading?: boolean
  empty?: ReactNode
  errorState?: ReactNode

  // ref（React 19 as prop）
  ref?: Ref<TableHandle<T>>
}
```

### 10.2 `ColumnDef<T>`

```ts
interface ColumnDef<T> {
  key: string
  title: ReactNode | (() => ReactNode)
  field?: keyof T // 省略时须提供 render
  render?: (row: T, ctx: CellCtx) => ReactNode

  // 宽度
  width?: number | 'auto' | `${number}%`
  minWidth?: number
  maxWidth?: number
  flex?: number
  resizable?: boolean

  // 固定
  fixed?: 'left' | 'right'

  // 显隐
  hidden?: boolean

  // 排序
  sortable?: boolean | { multi?: boolean }
  sorter?: (a: T, b: T) => number
  defaultSortDirection?: 'asc' | 'desc'

  // 筛选
  filter?:
    | { type: 'enum'; options: { value: unknown; label: string }[] }
    | { type: 'text'; predicate?: 'contains' | 'startsWith' | 'equals' }
    | { type: 'custom'; render: (ctx: FilterCtx) => ReactNode }

  // 多级表头
  children?: ColumnDef<T>[]

  // 无障碍
  ariaLabel?: string
}
```

### 10.3 拖拽上下文

```ts
interface DropCtx<T> {
  dragRow: T
  dragKey: RowKey
  targetRow: T | null // 拖到空区时 null
  targetKey: RowKey | null
  position: 'before' | 'after' | 'inside'
  newParentKey: RowKey | null
  newIndex: number
  originalEvent: PointerEvent | KeyboardEvent
}
```

### 10.4 辅助类型（供 Props 引用）

```ts
type SortDirection = 'asc' | 'desc'

interface SortState {
  columnKey: string
  direction: SortDirection
  // 多列排序时的顺序（0 = 主排序），不填 = 单列排序
  priority?: number
}

type FilterState = Record<string /* columnKey */, FilterValue>

// 内置筛选值形态；custom 类型的筛选值形态由业务方决定
type FilterValue =
  | { type: 'enum'; values: unknown[] }
  | { type: 'text'; value: string; predicate: 'contains' | 'startsWith' | 'equals' }
  | { type: 'custom'; value: unknown }
  | null // null = 该列无筛选

interface CellCtx {
  rowIndex: number // 在 visibleRows 中的索引
  rowKey: RowKey
  depth: number
  isExpanded: boolean
  isSelected: boolean
}

interface FilterCtx {
  columnKey: string
  value: unknown // 当前筛选值
  onChange: (next: unknown) => void
  close: () => void
}

interface ResolvedColumn<T> {
  key: string
  title: ReactNode | (() => ReactNode)
  field?: keyof T
  render?: (row: T, ctx: CellCtx) => ReactNode
  computedWidth: number // 布局阶段算出的最终宽度（px）
  minWidth: number
  maxWidth: number
  fixed?: 'left' | 'right'
  hidden: boolean
  sortable: boolean
  sortMulti: boolean
  sorter?: (a: T, b: T) => number
  filter?: ColumnDef<T>['filter']
  depth: number // 多级表头中该列的深度
  leafKey?: string // 如果是分组表头，指向其叶子链
  ariaLabel?: string
}

interface CsvOptions<T = unknown> {
  columns?: string[] // 限定导出的列 key；不填 = 所有可见列
  includeHiddenColumns?: boolean // 默认 false
  separator?: string // 默认 ','
  newline?: string // 默认 '\n'
  header?: boolean // 默认 true
  formatter?: (value: unknown, column: ResolvedColumn<T>, row: T) => string
}
```

### 10.5 `TableHandle`（ref 暴露的命令式 API）

```ts
interface TableHandle<T> {
  scrollToRow(key: RowKey, options?: { align?: 'start' | 'center' | 'end' }): void
  scrollToTop(): void
  getVisibleRange(): [number, number]
  expandAll(): void
  collapseAll(): void
  refresh(): void // 强制重算 DataModel
  exportCsv(options?: CsvOptions<T>): string // 返回字符串（SSR 友好），业务方决定下载
}
```

### 10.6 `useTable` hook（headless 底层 API）

```ts
function useTable<T>(props: TableProps<T>): {
  visibleRows: InternalRow<T>[]
  columns: ResolvedColumn<T>[]
  state: {
    sort: SortState[]
    filter: FilterState
    expanded: Set<RowKey>
    selected: Set<RowKey>
  }
  actions: {
    toggleSort(key: string): void
    toggleExpand(key: RowKey): void
    toggleSelect(key: RowKey): void
    setColumnWidth(key: string, width: number): void
    // ...
  }
  virtualizer: {
    totalHeight: number
    visibleRange: [number, number]
    getRowStyle(row: InternalRow<T>): CSSProperties
  }
  dnd: {
    onPointerDown(row: InternalRow<T>, e: React.PointerEvent): void
    // ...
  }
}
```

`<Table>` 内部通过这个 hook 实现——两层 API 自消费，保证一致性。

## 11. 拖拽命中检测算法（v1 定案）

**UX 模式**：

- 被拖行**原地无样式**（不做高亮，视线跟随光标预览）
- DragOverlay 里显示悬浮预览 chip（首列内容 + 上下箭头 icon）
- Drop 指示：2px 蓝色横线（before/after）或 淡红/粉色背景（inside）

**Y 三段判定**（不使用 X 分段）：

```ts
function computeDropTarget<T>({
  dragKey,
  pointerY,
  targetRow,
  model,
  expandedKeys,
  allowInsideLeaf,
}): DropCtx<T> | null {
  const ratio = (pointerY - targetRow.rect.top) / targetRow.rect.height
  const canInside = targetRow.hasChildren || allowInsideLeaf

  let position: 'before' | 'after' | 'inside'
  let newParentKey: RowKey | null
  let newIndex: number
  let highlight: { row: RowKey; style: 'inside' } | null

  if (ratio < 1 / 3) {
    // Before target
    position = 'before'
    newParentKey = targetRow.parentKey
    newIndex = targetRow.index
    // Surely 解读：target 有父 → 高亮父为 inside 态
    highlight = targetRow.parentKey !== null ? { row: targetRow.parentKey, style: 'inside' } : null
  } else if (ratio < 2 / 3 && canInside) {
    // Inside target
    position = 'inside'
    newParentKey = targetRow.key
    newIndex = expandedKeys.has(targetRow.key)
      ? 0 // 已展开 → 变第一个子
      : (model.childrenMap.get(targetRow.key)?.length ?? 0) // 未展开 → 变最后一个子
    highlight = { row: targetRow.key, style: 'inside' }
  } else {
    // After target
    if (targetRow.hasChildren && expandedKeys.has(targetRow.key)) {
      // 已展开父级 → 视觉上"下方"就是第一个子 → 转 inside 首位
      position = 'inside'
      newParentKey = targetRow.key
      newIndex = 0
      highlight = { row: targetRow.key, style: 'inside' }
    } else {
      position = 'after'
      newParentKey = targetRow.parentKey
      newIndex = targetRow.index + 1
      highlight =
        targetRow.parentKey !== null ? { row: targetRow.parentKey, style: 'inside' } : null
    }
  }

  // 循环检测：禁止把祖先拖成子孙
  if (isDescendant(model, dragKey, newParentKey)) return null

  return { position, newParentKey, newIndex, highlight /* ... */ }
}
```

**关键规则**：

1. **叶子节点默认无 inside**（业务方可通过 `draggable.allowInsideLeaf = true` 允许）
2. **before + target 有父 → 高亮父级为 inside 态**（Surely 解读；数据结果 = 变成父的新子节点，位置在原 target 之前）
3. **after + 已展开父级 → 转 inside 首位**（视觉上下方就是它的第一个子）
4. **循环检测**：`isDescendant(model, dragKey, newParentKey)` 命中则返回 null（drop 无效）

**虚拟滚动兼容**：

- 拖行滚出可视区：dnd-kit DragOverlay 是独立 portal 层，drag state 与被拖 DOM 无耦合
- 边缘 autoScroll：`@dnd-kit/modifiers` autoScroll，触发区 40px，加速度 20→200 px/s
- Drop 指示线跨虚拟行：横线是 DragOverlay 里的绝对定位元素，位置从 `targetRow.rect` 计算

## 12. 虚拟滚动实现

### 12.1 核心算法（core/virtualizer）

```ts
function computeVisibleRange({ scrollTop, viewportHeight, rows, rowHeightFn, overscan }): {
  startIndex: number
  endIndex: number
  totalHeight: number
  offsetTop: number // 第一个可见行到顶部的距离
}
```

- **固定高**：`startIndex = floor(scrollTop / h)`
- **声明式函数高**：预计算前缀和 `offsets[i]`，二分查找。前缀和只在 `rows` 或 `rowHeightFn` 引用变化时重建
- **overscan**：视口上下各多渲染 N 行（默认 5），避免快速滚动白屏

### 12.2 DOM 布局

```html
<div class="dt-viewport" style="height: 400px; overflow: auto">
  <div class="dt-body-scroller" style="height: {totalHeight}px; position: relative">
    <!-- 每行 -->
    <div
      class="dt-row"
      style="position: absolute; top: 0; transform: translate3d(0, {offset}px, 0); height: {h}px"
    >
      ...
    </div>
  </div>
</div>
```

**为什么 `translate3d` 而不是 `top`**：GPU 合成层，滚动时无 reflow，60fps 无压力。
**为什么 `absolute` 而不是 CSS Grid**：Grid 下不可见行仍占布局空间。

### 12.3 固定列布局（三层）

```html
<div class="dt-table" role="grid">
  <div class="dt-viewport">
    <!-- overflow: auto -->
    <div class="dt-body-scroller"></div>
    <!-- position: relative -->
  </div>
  <div class="dt-fixed-left-pane"></div>
  <!-- position: sticky; left: 0 -->
  <div class="dt-fixed-right-pane"></div>
  <!-- position: sticky; right: 0 -->
</div>
```

固定列 pane 从相同的 `visibleRange` 派生，独立渲染 fixed 列。**不要在虚拟行内嵌套 sticky 单元格**——absolute 定位下 sticky 不生效。

### 12.4 与 useTransition 的配合

`sort` / `filter` 切换时用 `startTransition` 包裹 setState，让重排耗时不阻塞滚动。

## 13. 状态管理

### 13.1 State 分类

**① 派生 state**（由输入推导，不独立存在）：

- `DataModel`（`data + tree` 归一化）
- `visibleRows`（`model + expanded + sort + filter`）
- `virtualRange`（`visibleRows + scrollTop + viewportH`）
- `resolvedColumns`（`columns + hidden + widths`）

**② 交互 state**（用户操作产生，受控/非受控双支持）：

- `expandedKeys: Set<RowKey>`
- `selectedKeys: Set<RowKey>`
- `sort: SortState[]`
- `filter: FilterState`
- `columnWidths: Record<string, number>`
- `columnOrder: string[]`
- `columnVisibility: Record<string, boolean>`

**③ 瞬态 state**（不需要持久化、无受控 API）：

- `scrollTop`（DOM 直读，非 React state）
- `hoveredRowKey`
- `draggingKey`
- `dropTarget`

### 13.2 受控/非受控

统一用 `useControllable(prop, defaultProp, onChange)` hook：

- 只传 `xxx`（如 `expandedKeys`）= 受控
- 只传 `defaultXxx`（如 `defaultExpandedKeys`）= 非受控
- 两者都传 = 以受控为准 + dev warning

### 13.3 Memoize 规则

1. `DataModel` 缓存键：`(data 引用, tree config)`——业务方须 `useMemo` 稳定 `data`
2. `visibleRows` 缓存键：`(model, expanded, sort, filter)`
3. `virtualRange` 每帧算，输入很小（几个 number），< 1ms

### 13.4 Server 模式数据流

```ts
type RequestParams = {
  page?: number
  pageSize?: number
  sort: SortState[]
  filter: FilterState
  cursor?: string | number // 无限滚动模式
  limit?: number
}
```

- Server 模式下 **sort/filter 不本地执行**——只发 params 给 `onRequest`
- 分页切页 + 无限滚动触底共用同一个 `onRequest`
- **并发保护**：新 request 用 `requestId` 序号，旧 resolve 丢弃
- **失败不内置重试**：业务方在 `onRequest` 里 try/catch，抛错走 `errorState`

### 13.5 拖拽数据回写

```ts
// core 导出的纯函数
function applyDrop<T>(data: T[], ctx: DropCtx<T>, cfg: {
  rowKey: DataSource<T>['rowKey']
  tree?: DataSource<T>['tree']
}): T[]

// 业务方使用
<Table
  data={data}
  onDragEnd={ctx => {
    const newData = applyDrop(data, ctx, { rowKey, tree })
    setData(newData)
  }}
/>
```

`applyDrop` 支持扁平 / 嵌套两种形态；库自身**不 mutate** 任何东西。

## 14. 错误处理

| 类型                                                 | 处理                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **配置错误**（rowKey 不存在、mode 不匹配）           | Dev `console.warn`（含文档链接），prod 静音                                           |
| **数据错误**（重复 key / 悬空 parentKey / 循环引用） | normalize 阶段收集、尽可能渲染、dev warn                                              |
| **运行时错误**（用户回调 throw）                     | 单行 ErrorBoundary 隔离；onRequest reject → errorState；beforeDrop reject → drop 中止 |

**ErrorBoundary 策略**：内置一层，**只包 Row/Cell**（作用域限单行）。不包整个 Table（留业务方全局处理）。不使用 React 19 的 `onCaughtError`。

## 15. 样式约定

- **CSS 变量集中在 `theme/vars.css`**：`--dt-*` 前缀
- **BEM 类名**：`.dt-table`、`.dt-row`、`.dt-row--dragging`、`.dt-cell__content`
- **样式覆盖**：优先改 CSS 变量；进阶改类名样式
- **图标**：inline SVG（展开箭头、排序箭头、拖拽 handle、复选框状态），不引入 icon 库

**核心 CSS 变量清单**：

```css
--dt-border-color
--dt-row-hover-bg
--dt-row-selected-bg
--dt-header-bg
--dt-cell-padding-x
--dt-cell-padding-y-compact / normal / loose
--dt-drop-inside-bg          /* inside 目标行淡红/粉色背景 */
--dt-drop-indicator          /* before/after 蓝色横线 */
```

## 16. 构建产物 & 分发

- **产物格式**：ESM + CJS 双输出（tsdown 生成）
- **类型定义**：d.ts bundle 随包发布
- **CSS 分发**：`@draggable-table/theme` 独立包，业务方主动 `import '@draggable-table/theme'`
- **sideEffects**：`"sideEffects": ["**/*.css"]`

**使用姿势**：

```ts
import { Table } from '@draggable-table/table'
import '@draggable-table/theme'
```

## 17. React 19 特性使用

- **✅ ref as prop**：直接 destructure `props.ref`，不用 forwardRef
- **✅ useTransition / useDeferredValue**：大数据排序/筛选切换时包 startTransition
- **❌ React Compiler**：与 Rolldown 集成未稳，v1 手动 useMemo
- **❌ Actions / use()**：组件库不侵入业务 async 模型

## 18. 测试策略

### 18.1 分层

- **单元测试（Vitest）**：core 纯函数 90%+ line / 85%+ branch；table hooks 用 `renderHook`
- **组件测试（Vitest + jsdom + RTL）**：渲染、受控/非受控、排序/筛选面板。**不测拖拽**（jsdom pointer 不完整）
- **E2E（Playwright）**：拖拽、虚拟滚动、固定列、SSR build 输出验证、axe-core a11y 扫描
- **性能基线**：
  - 10 万行数据渲染 < 100ms
  - 快速滚动 ≥ 55fps
  - 拖拽 hitTest < 5ms（100 层深树）
  - 每 v1 版本记录基线，回归报警

### 18.2 CI 流水线

```
GitHub Actions:
  1. install (pnpm)
  2. lint (Oxlint)
  3. typecheck (tsc -b --noEmit)
  4. test:unit (Vitest, 并行)
  5. build (tsdown, all packages)
  6. test:e2e (Playwright, PR + main 都跑)
  7. bench (仅 main 跑，记录到 .github/perf-baseline.json)
  8. release (Changesets action, 仅 main + review 通过)
```

## 19. Milestones

顺序：**M0 → M1 → M2 → (M3 ⇄ M4 可并行) → M5 → M6 → M7**

### M0 · 骨架搭建

**目标**：monorepo 能跑起来，能发一个空组件到 npm。

**任务**：

- pnpm workspace + tsconfig.base + oxlint + prettier + changesets
- packages/core、table、theme 三个空包，tsdown 打包配置
- apps/playground（Vite + React 19，引用 workspace 的 table）
- apps/docs VitePress 空壳
- GitHub Actions：lint / typecheck / build 三步 CI

**验收标准**：

- [ ] `pnpm install` 一次成功
- [ ] `pnpm build` 三个包各出 `dist/`（含 ESM + CJS + d.ts）
- [ ] `pnpm dev` playground 显示 "Hello Draggable Table"
- [ ] `pnpm lint` 无 error
- [ ] `pnpm typecheck` 无 error
- [ ] CI 全绿

### M1 · Core 纯函数层

**目标**：core 里所有纯函数完成 + 单元测试。

**任务**（按依赖顺序）：

- `DataModel` + `normalize`（三种输入形态：扁平列表 / 嵌套 / 扁平+parentKey）
- `traverse` 工具（dfs / bfs / getDescendants / isDescendant）
- `computeVisibleRows`（合并 sort/filter/expand，memoize）
- `prefixSum` + `computeVirtualRange` + `overscan`
- `resolveColumns`（flex / auto / fixed 宽度分配）
- `hitTest`（第 11 节完整算法）
- `applyDrop`（扁平 + 嵌套两个实现）
- `toCsv`

**验收标准**：

- [ ] Vitest 单元测试 ≥ 90% line、85% branch
- [ ] `@draggable-table/core` 可独立 npm publish 并被外部项目 import
- [ ] core 包 `deps: {}`（除 devDep 外无任何运行时依赖）
- [ ] `pnpm test` 全绿

### M2 · 静态渲染

**目标**：能显示表格但没有任何交互。

**任务**：

- `<Table>` 组件骨架 + `useTable` hook
- Header + Body + Row + Cell 组件
- 树形展开（受控 `expandedKeys` / 非受控 `defaultExpandedKeys` + `defaultExpandedDepth`）
- 固定列（sticky pane 三层布局，第 12.3 节）
- 多级表头（`ColumnDef.children` 递归）
- 基础 CSS（theme 包完整覆盖）
- Playground demo：01-basic、02-tree、06-fixed-columns、07-multi-header

**验收标准**：

- [ ] 1000 行嵌套树能正常展示
- [ ] 树形展开/收起切换 OK
- [ ] 左右固定列在横向滚动时保持位置正确
- [ ] 多级表头层级正确
- [ ] `useTable` hook 单独使用能拿到 visibleRows

### M3 · 虚拟滚动

**目标**：10 万行数据流畅滚动。

**任务**：

- `useVirtualizer` 集成 core/computeVirtualRange
- DOM 层：viewport + spacer + absolute 行 + translate3d
- overscan（默认 5）
- 声明式函数行高（`rowHeight: (row) => number`）
- 固定列 pane 与主 viewport 的滚动同步（`useScrollSync`）
- Playground demo：05-virtual-100k

**验收标准**：

- [ ] 10 万行数据首次渲染 < 100ms
- [ ] 快速滚动帧率 ≥ 55fps（Chrome DevTools performance panel 验证）
- [ ] 声明式函数行高：不同 row 类型返回不同高度时布局正确
- [ ] 固定列 pane 在滚动时位置与主 viewport 同步

### M4 · 数据处理

**目标**：排序 + 筛选 + 服务端模式。

**任务**：

- Header 里的排序 icon + 点击切换（asc / desc / null 三态）
- 多列排序（Ctrl+Click 加入多列，`ColumnDef.sortable = { multi: true }`）
- 内置 `FilterPopover`（enum + text）
- Custom filter（`ColumnDef.filter.type = 'custom'`）
- Server 模式（`onRequest` + `requestId` 并发保护 + `mode: 'server'` + `totalCount`）
- 无限滚动（`infiniteScroll: { hasMore, onLoadMore, threshold }`）
- `useTransition` 包 sort/filter setState
- Playground demo：08-server-side、09-infinite-scroll

**验收标准**：

- [ ] Server 模式：所有 sort/filter/paging 参数正确发到 onRequest
- [ ] 并发多次点击排序：只有最后一次 request 的结果生效
- [ ] 无限滚动触底：`onLoadMore` 触发；返回后追加数据
- [ ] 客户端模式 + 10 万行 + sort 切换：视口滚动不卡

### M5 · 拖拽（v1 最难）

**目标**：行拖拽 + 列拖拽 + 完整 UX（第 11 节）。

**任务**：

- 集成 `@dnd-kit/core` + `@dnd-kit/sortable`
- `useDnd` hook 桥接 core/hitTest 到 dnd-kit
- 行拖拽（同层 + 跨层 before/after/inside）
- `DragOverlay` 悬浮预览 chip
- `DropIndicator`（2px 蓝色横线 + inside 淡红背景）
- autoScroll（`@dnd-kit/modifiers`，40px 触发区）
- `allowDrop`（同步）+ `beforeDrop`（异步，Promise）
- 列拖拽排序
- 列宽 resize（handle + minWidth/maxWidth 约束）
- 循环检测（`isDescendant` 判断）
- 键盘拖拽（dnd-kit KeyboardSensor 内置）
- Playwright E2E 拖拽测试（同层、跨层、循环、自动滚动、drop 校验）
- Playground demo：03-drag-row、04-drag-column

**验收标准**：

- [ ] 10 万行数据 + 深层树 + 拖拽三种落点（before/after/inside）全部工作
- [ ] 拖到边缘 40px 内自动滚动
- [ ] 被拖行滚出可视区后拖拽状态不丢失
- [ ] 循环检测：拖父到子的子孙时 drop 无效
- [ ] `beforeDrop` reject 时 drop 中止、UI 回到拖起前状态
- [ ] E2E 全部 pass

### M6 · 选择 + 详情面板 + 细节能力

**目标**：完整选择系统 + 零散功能。

**任务**：

- selection（single / multiple / checkbox / cascadeParent / keepAcrossPages）
- Ctrl+Click 增选、Shift+Click 范围选（在**可见行**范围内）
- 父子联动（`cascadeParent = true` 默认）：勾父 → 勾所有子 + 半选态显示
- `expandableRow`（详情面板，与树形展开互相独立，行可同时有两个"展开"状态）
- `columnVisibility` API（Table props + hook actions）
- 密度 / 边框 / 斑马纹样式切换（CSS 变量）
- Empty / Loading / ErrorState 组件（带默认 UI + slot 覆盖）
- `exportCsv` helper
- SSR 兼容检查（`useIsomorphicLayoutEffect`、Vite SSR build 无报错）
- 基础 a11y（`role="grid"`、`role="row"`、`role="gridcell"`、`aria-selected`、`aria-expanded`、`aria-level`、键盘 focus 到行）
- Playground demo：10、11、13-headless

**验收标准**：

- [ ] `pnpm build:ssr` playground SSR 输出成功
- [ ] axe-core 扫描无 serious/critical 违规
- [ ] 键盘 Tab 能 focus 到行；Enter/Space 触发选择
- [ ] cascadeParent：勾父 → 子全勾 + 半勾态显示正确

### M7 · 打磨 + 文档 + 发布

**任务**：

- Docs 全部页面（guide × 8 + api × N + examples via iframe embed playground）
- 性能基线 CI 步骤（记录到 `.github/perf-baseline.json`）
- Bug 修复轮次
- 类型 review：所有导出的 API 类型都有 JSDoc
- README + Changelog（Changesets 生成）
- 第一次 npm publish：`@draggable-table/core`、`table`、`theme`

**验收标准**：

- [ ] 从零 `npm i @draggable-table/table @draggable-table/theme` 到能跑起 basic demo
- [ ] Docs 站可访问、所有 examples iframe 加载正常
- [ ] 类型定义无 `any`（除内部实现细节）

## 20. AI 结对时容易踩的坑（清单）

写实现时特别注意：

1. **虚拟滚动下不要在虚拟行内部嵌套 sticky**——`position: sticky` 的祖先不能是 `position: absolute + overflow`；固定列必须用**独立 pane**
2. **`applyDrop` 不要 mutate 传入的 data**——所有返回新数组
3. **`computeVisibleRows` 必须 memoize**——大数据下每帧重算会卡
4. **DataModel 内部 rows 数组的顺序**：必须保证父在子前，`normalize` 输出时按 dfs 顺序
5. **懒加载 `loadChildren` 返回的新子节点**：由业务方 setData 传回，库不 mutate；`childrenLoaded` 从新 DataModel 派生
6. **循环检测在 hitTest 出口做，不是入口**——`isDescendant(model, dragKey, newParentKey)` 用**计算出来的**新父，不是 target
7. **`useTransition` 只包 sort/filter setState**——不要包 expand（expand 需要即时响应）
8. **Server 模式 sort/filter 一定不本地执行**——即使 client-side data 是可排序的
9. **`translate3d` 而非 `top`**——GPU 合成层，滚动无 reflow
10. **`ref as prop` 是 React 19 语法**——不用 `React.forwardRef`
11. **`@draggable-table/core` 保持零外部依赖**——不 import 任何东西（连 React 都不 import）
12. **测试拖拽只在 Playwright**——jsdom 的 PointerEvent 不完整
13. **`overscan` 默认 5**——太多浪费渲染，太少快速滚动白屏
14. **`prefixSum` 只在 rows 或 rowHeightFn 引用变化时重建**——不是每次 render 都重建

## 21. 决策附录（供未来自己/贡献者参考）

**为什么不做自由合并单元格（数据驱动 rowSpan）？**
AG Grid Enterprise 用维护"合并区间树"（interval tree）实现，滚动时 O(log n) 查询"当前视口内的合并块"，虚拟化窗口动态延伸行渲染范围。这不是 Canvas 或 WASM 的功劳而是数据结构的功劳——DOM 也能做，但编辑、复制、选区、拖拽全都要跟着重写。v1 划为 non-goal 是范围决策不是技术决策。v2 若做，限制在"同列相邻值相同"这类静态规则或非虚拟滚动模式。

**为什么不引入 Immer？**
Core 是纯函数库不是应用 state manager；Immer 的 Proxy 有非零开销，加到我们库上会显著增加 bundle；`applyDrop` 手写只有 ~60 行。业务方自己想用 Immer 完全可以在 `onDragEnd` 里包 `produce()`。

**为什么不做左移跳出层级的拖拽 UX？**
X 位置分段是隐藏交互，新用户不会尝试；业务里跨层级拖拽的高频场景是"跨父级同层拖"，通过 target 位置就能表达；想跳出层级可以两次拖拽绕开。

**为什么行虚拟滚动只支持声明式行高（v1 不做测量式）？**
测量式变高在拖拽 × 虚拟滚动的组合下会引入行高抖动、autoScroll 触发时机不稳、drop 阈值闪跳等问题。解决方案是 scroll anchoring + ResizeObserver 批量 + 好估算函数（Worker/rIC 都帮不上，DOM 测量跨不过主线程），是 v2 的一块独立工作。声明式行高已能覆盖 80% 变高场景。

**为什么用 dnd-kit 而不是 react-dnd 或自研？**

- react-dnd 底层仍是 HTML5 DnD，被拖 DOM 消失时 undefined behavior，与虚拟滚动冲突
- dnd-kit pointer-based + 触摸 + 键盘统一 sensor，天然与虚拟滚动兼容
- 自研会让 v1 工作量增加 30-50%（键盘 / 触摸 / a11y 都要自己做）

**为什么固定列用独立 sticky pane 而不是嵌入虚拟行？**
`position: sticky` 在 `absolute + overflow` 祖先下失效。AG Grid 也是这么处理的。

---

**本 spec 的目标是让 vibe coding 时 AI 有足够上下文一次写对**。任何模糊描述都是 bug，欢迎提 issue 让我 refine。
