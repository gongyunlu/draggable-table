# @draggable-table Implementation Plans

**Spec:** [../specs/2026-07-01-draggable-table-design.md](../specs/2026-07-01-draggable-table-design.md)

**Execution Mode:** Vibe coding — each milestone is an independent AI-paired session. Open the corresponding plan, execute task-by-task, verify the milestone's acceptance criteria (from the spec), then move to the next.

## Milestone Order

```
M0 → M1 → M2 → (M3 ⇄ M4 parallel) → M5 → M6 → M7
```

Do not skip ahead. Each milestone's tasks assume prior milestones are complete.

## Plans

| #   | Milestone                        | Plan                                                                     | Depends On |
| --- | -------------------------------- | ------------------------------------------------------------------------ | ---------- |
| M0  | 骨架搭建（monorepo、tsdown、CI） | [2026-07-01-m0-scaffold.md](2026-07-01-m0-scaffold.md)                   | —          |
| M1  | Core 纯函数层                    | [2026-07-01-m1-core.md](2026-07-01-m1-core.md)                           | M0         |
| M2  | 静态渲染（无交互）               | [2026-07-01-m2-static-render.md](2026-07-01-m2-static-render.md)         | M0, M1     |
| M3  | 虚拟滚动                         | [2026-07-01-m3-virtual-scroll.md](2026-07-01-m3-virtual-scroll.md)       | M0, M1, M2 |
| M4  | 数据处理（排序/筛选/server）     | [2026-07-01-m4-data-processing.md](2026-07-01-m4-data-processing.md)     | M0, M1, M2 |
| M5  | 拖拽（最难）                     | [2026-07-01-m5-dnd.md](2026-07-01-m5-dnd.md)                             | M0-M4      |
| M6  | 选择 + 细节能力                  | [2026-07-01-m6-selection-details.md](2026-07-01-m6-selection-details.md) | M0-M5      |
| M7  | 打磨 + 文档 + 发布               | [2026-07-01-m7-polish-publish.md](2026-07-01-m7-polish-publish.md)       | M0-M6      |

## How to Execute a Milestone

1. Open the plan file for the current milestone
2. Read the plan header (Goal, Architecture, Tech Stack) — this frames the whole milestone
3. Execute tasks in order, checking off each step (`- [ ]` → `- [x]`)
4. Run all acceptance checks listed at the end of the plan (they mirror the spec's验收标准)
5. Commit the completed milestone plan alongside code changes
6. Only then move to the next milestone

## Cross-Cutting Reminders (from spec §20)

Always keep in mind during any milestone:

1. `position: sticky` cannot nest inside `position: absolute + overflow` — fixed columns must be an independent pane
2. `applyDrop` never mutates input `data`
3. `computeVisibleRows` must be memoized
4. `DataModel.rows` must be in DFS order (parent before children)
5. `loadChildren` result: business code setsData; library never mutates
6. Circular check happens at hitTest exit using **computed** `newParentKey`, not target
7. `useTransition` wraps sort/filter setState only — not expand
8. Server mode never runs sort/filter locally
9. Use `translate3d`, not `top`, for row positioning
10. React 19 `ref` as prop — no `forwardRef`
11. `@draggable-table/core` stays zero-dep — no `import` of anything, not even React
12. Drag tests live only in Playwright (jsdom lacks proper PointerEvent)
13. `overscan` default is 5
14. `prefixSum` rebuild only when `rows` or `rowHeightFn` reference changes
