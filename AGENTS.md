# dsh-web-mobile

## Project

- **Fork**：[`911218sky/dsh-web-mobile`](https://github.com/911218sky/dsh-web-mobile)（上游 [`mexiaosqwq/dsh-web-mobile`](https://github.com/mexiaosqwq/dsh-web-mobile)）。
- **目标版本**：DSH **0.2.0-rc.1 / rc.2**（0.1.x 多数仍可用）+ `tsdown`；**不**维护 aionui / dsh-file-viewer / dsh-web-all 专用适配。对外说明以 [README.md](README.md) 为准。
- 激活条件：`MOBILE_QUERY = '(max-width: 1023px) and (pointer: coarse)'`（`phone-chrome.ts`）。鼠标桌面任意宽度 no-op；会话删除例外走 `TOUCH_QUERY = '(pointer: coarse)'`（含宽屏平板）。
- 包名 / patch id = `dsh-web-mobile`；DOM 仍用 `data-mobile-nav` / `?mobile-nav-debug=1`（旧词根刻意保留）。
- 入口：
  - `cordis.patch.yml` → 宿主行
  - `src/index.ts` → 响应压缩（`compress.ts`）+ 会话删除端点（`delete-session.ts`）
  - `src/client/index.tsx` → 浏览器半区（slots + styles + effects）

```text
dsh-web-mobile/
├─ src/
│  ├─ index.ts · compress.ts · delete-session.ts
│  └─ client/
│     ├─ index.tsx · debug.ts · components/ · core/ · i18n/
│     ├─ effects/          ← 17 个效果模块
│     └─ styles/           ← base → layout → compat → misc
├─ lib/                    ← pnpm build（tsdown）生成，勿手改
├─ scripts/                ← CDP 探针 .mjs + probes/ ← 21 个回归锚点
├─ tests/                  ← 36 个测试文件
├─ docs/
│  ├─ specs/               ← 8 篇权威设计文档
│  ├─ maintenance/pitfalls.md
│  ├─ upstream/            ← upgrade-runbook.md · compat-contracts.json · host-jank-feedback.md
│  └─ debug/               ← 布局/composer 考古（按需）
├─ tsdown.config.ts · tsconfig.json · assets/
└─ .github/workflows/ci.yml
```

## Docs

- 动手改代码前 → `docs/maintenance/pitfalls.md`（坑名 = 下方 Pitfalls 索引）
- 手势契约 → `docs/specs/2026-08-27-sidebar-swipe-gestures.md`、`docs/specs/2026-09-13-files-swipe-gesture-design.md`
- 面板 / 抽屉共存 → `docs/specs/2026-09-17-sidebar-files-coexistence-design.md`、`docs/specs/2026-09-06-conversation-overlay-takeover-design.md`
- CSS / 设置头 / 市场 / CDP 门 → `docs/specs/2026-08-16-css-code-organization-design.md`、`docs/specs/2026-08-16-settings-header-design.md`、`docs/specs/2026-08-22-plugin-market-gallery-design.md`、`docs/specs/2026-08-18-cdp-regression-gate-design.md`
- 宿主升级 → `docs/upstream/upgrade-runbook.md` + `docs/upstream/compat-contracts.json`；卡顿反馈 → `docs/upstream/host-jank-feedback.md`
- 设置市场 / composer 考古 → `docs/debug/settings-market-debug-map.md`、`docs/debug/composer-tree-recon.md`

## Commands

```sh
pnpm install
pnpm verify          # tsc --noEmit
pnpm test:core       # node --test tests/*.test.ts（36 个测试文件）
pnpm build           # tsdown → lib/（改源码后必跑，lib 入库）
```

本地挂载：

```sh
dsh plugin --profile web add link:/path/to/dsh-web-mobile
dsh web
```

可选探针（需本机 DSH Web）：

```sh
DSH_PROBE_SESSION_ID=<id> pnpm smoke:cdp
node scripts/cdp-swipe-probe.mjs
node scripts/cdp-zoom-probe.mjs
node scripts/cdp-compat-contracts.mjs
```

## Architecture

- Host 半区极简：压缩 + 删除端点。浏览器行为全在 `src/client/`。
- Slots：`MobileNavToggle`（header）、`ComposerFileButton`（输入左）、`MobileDrawerFooter`（session-log）。
- Reconciler：`core/reconciler-core.ts`（零 import）+ `phone-chrome.ts` 适配；任务含 frame / stats / overlay-fab / panel-exit。
- 主要 effects：`phone-chrome`、`sidebar-swipe` + `gesture-guard`、键盘 / 聚焦守卫、chip 再点关闭、`session-menu`（删除会话）、`panel-exit`。
- Styles：`base → layout → compat → misc` 顺序是行为契约（compat 覆盖 layout；misc 管桌面隐藏）。
- 本 fork **不**维护第三方 sheet 适配；优先宿主 slot / API。

## Workflow（本 fork）

- 本地可自主 commit；**push / 发版**等用户明确同意。
- 宿主升级、npm publish、GitHub Release 须单独确认。
- Bug：根因不明时先报告再修；一眼能修的直接改。
- 验证：`pnpm verify` + `pnpm test:core` + `pnpm build`；行为层用活宿主 / 真机。

## Conventions

- 稳定 `data-*` 与结构选择器优先；哈希类只用子串 `[class*=_frag]`，禁止 `$=`。
- 长生命周期监听 / Observer 放进 `ctx.effect`；宽度敏感效果用 `installMobileEffect` + `MOBILE_QUERY`。
- 标记契约：`data-mobile-nav="frame"|stats|…`、`data-sidebar-collapsed`、`data-mobile-nav-ios`。
- 客户端相对导入带 `.ts`/`.tsx`；单引号、无分号；`install<Domain>` 命名。
- 勿手改 `lib/`；locale 先 `zh` 再镜像 `en`。
- 开态抽屉用 `transform: none`（不是 `translateX(0)`），固定子节点 containing block 才对。

## Pitfalls

- 原文在 `docs/maintenance/pitfalls.md`，锚点 `### <名字>`。改相关代码前先读对应条。

- `手势层`
- `files 手势`
- `抽屉导航 click`
- `抽屉行菜单`
- `backdrop 误吞`
- `composer 行`
- `键盘 guard`
- `断点与设备`
- `探针运行环境`
- `iOS zoom`
- `探针基线`
- `meme 卡`
- `preset 菜单`
- `header 拥挤`
- `header 行高与弹层`
- `files 按钮`
- `哈希子串`
- `工具栏锚定`
- `tooltip`
- `hero 净空`
- `hero 输入框下限`
- `overlay 两信号`
- `tab strip`
- `reconciler`
- `文档漂移`
- `合并冲突`
- `子代理芯片`
- `subagent 两代`
- `irow`
- `市场头`
- `dshmarket`
- `debug badge`
- `反引号`
- `has 下限`
- `lib 纪律`
- `bundle 校验`
- `host ESM`
- `safe-area`
- `Files 面板 safe-area`
- `响应压缩`
- `会话删除`
- `0.1.5 抽屉 z 与遮罩`
- `0.1.5 关态槽位`
- `性能契约`
- `Shiki`
- `包改名边界`
- `字号轴`
- `两个 closer`
- `ghost details`
- `dialog footer 按钮`
- `composer 文件入口`
- `代际门控`
- `谓词复用与豁免`
- `第三方模型条`
- `工作区 chip 再点关闭`
- `全屏侧边栏面板带`
- `搬宿主 React 节点`
- `弹层闪`
- `ContextMeter 挪位`
- `peer 范围与宿主门禁口径`

## Testing & QA

- 门禁：`pnpm verify` → `pnpm test:core` → `pnpm build` → `git diff --exit-code HEAD -- lib`。
- CI：`.github/workflows/ci.yml`（同上 + lib 新鲜度）。`fix/*` 分支推送不跑 CI。
- 真机：窄屏抽屉/sheet/键盘；桌面（鼠标）任意宽度无布局变化；宽屏触控平板仍有「删除会话」。
- 调试：`?mobile-nav-debug=1`。探针脚本见 Commands；Termux 需可写 `TMPDIR`/`XDG_RUNTIME_DIR`。

## Maintenance

- 本文件控制在 64KB 以内；长证据进 `docs/`。
- 对外只维护精简 README；changelog 写 Release，不堆 README。
- 计数（effects / probes / tests / specs）以本文件与 `tests/docs-consistency.test.ts` 为准，改树后同步数字。
