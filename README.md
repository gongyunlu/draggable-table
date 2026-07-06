# @draggable-table

React 19+ 生态下的高性能可拖拽树形表格组件库。**树形数据 + 拖拽（含跨层级）+ 虚拟滚动**三者能同时工作，不做"选了 A 就得放弃 B"的伪功能。

> 当前状态：M0 骨架完成，M1 起进入实际功能开发。发布前 API 可能改动。

## 包结构

```
draggable-table/
├── packages/
│   ├── core/     → @draggable-table/core   纯 TS 核心算法，零运行时依赖
│   ├── table/    → @draggable-table/table  React 组件层
│   └── theme/    → @draggable-table/theme  默认 CSS 主题
├── apps/
│   ├── playground/   Vite + React 19，开发时 demo
│   └── docs/         VitePress 文档站
├── tests/e2e/        Playwright（M5 起启用）
└── docs/superpowers/
    ├── specs/        设计规约（v1 全量）
    └── plans/        分里程碑的实现计划（M0-M7）
```

**依赖关系**：`table` → `core` + `@dnd-kit/*`，peer 要求 `react >= 19.0.0`。`core` 保持零外部依赖（可在 Node/Worker 里跑）。`theme` 是纯 CSS。

## 快速开始

```bash
pnpm install                        # 装依赖
pnpm dev                            # 启动 playground（http://localhost:5173）
pnpm dev:docs                       # 启动文档站
pnpm build                          # 构建三个可发布包
pnpm build:apps                     # 构建 playground + docs
pnpm lint                           # oxlint
pnpm typecheck                      # tsc --noEmit 全仓
pnpm format                         # prettier --write 全仓
pnpm changeset                      # 记录一次版本变更
```

要求：Node ≥ 20、pnpm 9.15.x。

## 路线图

按里程碑推进，顺序为 **M0 → M1 → M2 → (M3 ⇄ M4 可并行) → M5 → M6 → M7**。每个里程碑有独立的 plan：

| #   | 里程碑                           | Plan                                                                                            |
| --- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| M0  | 骨架搭建（monorepo、工具链、CI） | [2026-07-01-m0-scaffold.md](docs/superpowers/plans/2026-07-01-m0-scaffold.md)                   |
| M1  | Core 纯函数层                    | [2026-07-01-m1-core.md](docs/superpowers/plans/2026-07-01-m1-core.md)                           |
| M2  | 静态渲染（无交互）               | [2026-07-01-m2-static-render.md](docs/superpowers/plans/2026-07-01-m2-static-render.md)         |
| M3  | 虚拟滚动                         | [2026-07-01-m3-virtual-scroll.md](docs/superpowers/plans/2026-07-01-m3-virtual-scroll.md)       |
| M4  | 数据处理（排序 / 筛选 / server） | [2026-07-01-m4-data-processing.md](docs/superpowers/plans/2026-07-01-m4-data-processing.md)     |
| M5  | 拖拽                             | [2026-07-01-m5-dnd.md](docs/superpowers/plans/2026-07-01-m5-dnd.md)                             |
| M6  | 选择 + 细节能力                  | [2026-07-01-m6-selection-details.md](docs/superpowers/plans/2026-07-01-m6-selection-details.md) |
| M7  | 打磨 + 文档 + 发布               | [2026-07-01-m7-polish-publish.md](docs/superpowers/plans/2026-07-01-m7-polish-publish.md)       |

完整设计规约：[docs/superpowers/specs/2026-07-01-draggable-table-design.md](docs/superpowers/specs/2026-07-01-draggable-table-design.md)。

## 工程约定

- **Commit message**：Conventional Commits（`feat` / `fix` / `chore` / `docs` / `ci` / `style` / `refactor`），由 commitlint 在 commit-msg 阶段强制
- **提交前**：pre-commit 自动对 staged 文件跑 `prettier --write` + `oxlint`，格式化改动自动进本次 commit
- **换行**：全仓 LF（`.gitattributes` 强制 + `.editorconfig` 提示）
- **版本**：Changesets 管理，`core` / `table` / `theme` 通过 `linked` 保持同版本节奏
- **CI**：GitHub Actions 每次 push/PR 跑 lint → typecheck → test → build → build:apps

## 许可

MIT
