# dsh-web-mobile

DSH Web UI 的**手机端适配**：窄屏触控下把官方界面改成抽屉 / sheet / 输入区布局；桌面（鼠标）任何宽度都是 no-op。

本仓库是 [`911218sky/dsh-web-mobile`](https://github.com/911218sky/dsh-web-mobile)，自 [`mexiaosqwq/dsh-web-mobile`](https://github.com/mexiaosqwq/dsh-web-mobile) fork，方便自行修改与维护。

## 这个 fork 改了什么

| 改动 | 说明 |
| --- | --- |
| 目标版本 | **DSH `>=0.2.0-0 <0.3.0`**（0.2.x 线，含 rc） |
| TypeScript + `tsdown` | 与其他自维护插件同一套构建，改源码后 `pnpm build` 即可 |
| 第三方适配 | 不维护 aionui / dsh-file-viewer / dsh-web-all 专用补丁；需要完整适配请用上游包 |
| 文档收口 | README 只留 fork 差异、能力与安装；发版细节放 GitHub Release |

**核心手机 UI 全部保留**：

- 抽屉、FAB、遮罩、侧滑开合
- 设置 / 文件树 / 预览 → 底部 sheet
- 状态栏安全区、主题色、键盘避让
- 会话删除、大 JSON 响应压缩

| 会话主页 | 目录抽屉 | 设置界面 |
| --- | --- | --- |
| ![移动端会话主页](assets/hero.png) | ![目录抽屉](assets/drawer.png) | ![移动端设置界面](assets/settings.png) |

## 安装

```sh
dsh plugin --profile web add github:911218sky/dsh-web-mobile
```

本地开发：

```sh
dsh plugin --profile web add link:/path/to/dsh-web-mobile
dsh web
```

若曾装旧名 `dsh-mobile-nav`，先卸再装，避免重复注册。

## 构建

```sh
pnpm install
pnpm build
pnpm verify && pnpm test:core
```

工程约定见 [AGENTS.md](AGENTS.md)。

## License

[MIT](LICENSE)
