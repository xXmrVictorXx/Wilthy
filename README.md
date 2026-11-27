<div align="center">

<picture>
  <img src="assets/Wilthy_white_bg.png" alt="Wilthy" width="160">
</picture>

</div>

---

<div align="center">

**An Agent Harness designed for BNUZ students**

</div>

---

> [!IMPORTANT]
> 下载、安装或使用 Wilthy，即视为你已阅读并同意本项目的[使用条款](docs/terms.md)与[隐私条款](docs/privacy.md)。
> 如果你不同意其中部分内容，可以跳过对应服务的配置、不提供该项凭据，从而仅使用其余功能；如果你不同意全部条款，请停止使用并卸载本软件。

Wilthy 是一款面向北京师范大学珠海校区（BNUZ）同学的个人 Agent 应用，基于 [Dela](https://github.com/Chang-Yo/Dela) 修改而来，与学校没有隶属关系。

Wilthy 的内核基于 Pi 构建，校园服务都由你在学校官方的「数字京师·珠海」登录窗口中自行登录后访问。账号会话经系统钥匙串加密后保存在本机；模型服务相关信息以 JSON 文件保存在 `~/.wilthy`。所有数据保存在本地，不上传服务器。

## 功能概览

**所有侧栏功能入口可在 “设置 > 通用 > 导航入口” 中隐藏。**

### 校园信息服务

- **课表**：从教务系统同步个人课表，按学校校历与作息时间换算成每周日程，只读显示
- **成绩**：同步有效成绩与平时、期中、期末分项，显示教务系统给出的学分与平均学分绩
- **培养方案**：按课程模块查看已获学分与每门课的修读状态，也可以按学期查看计划课程；各类别的要求学分可以自己填写，也可以把学校发的培养方案文件交给 Agent 自动填写，页面按成绩和本学期课表显示已获、在修学分与差额
- **教务通知**：读取教务部网站的通知，新通知进入通知中心，可在应用内阅读正文
- **校园邮箱**：内置北师邮箱（网易企业邮）预设，也支持任意 IMAP/SMTP 邮箱的收信与写信，可以本地保存草稿；北师邮箱需要先在网页邮箱设置里开启 IMAP/SMTP 并生成客户端授权码
- **全局搜索**：搜索内容跨项目、会话、邮件和设置
- **TODO**：个人安排的唯一入口，每条可设截止、时段或全天；月视图支持“滑拽式”新建，可以在月历图和列表两种视图中切换

### Agent 功能

Wilthy Harness 基于 Pi 构建，可以作为一款通用 agent 产品使用，并且 Wilthy 在 Coding 领域进行了特别加强。

- **第三方接入**：支持导入第三方 skills、接入 MCP 服务器
- **内置校园 skills**：Agent 可以直接读取个人邮件、课表、成绩与培养方案进度，详见应用内的内置校园 skills
- **联网**：提供自定义的 `web_search` 工具接入（如 DeepSeek、Brave、Google，默认关闭，需自备 API KEY）与免费的 `web_fetch` 工具（默认开启）
- **文档读取**：填入自己的 MinerU Token 后，`read_document` 工具可以读取 PDF、Word、PowerPoint 与 Excel，保留公式与表格（文档会上传到 MinerU 解析，默认关闭）
- **上下文**：`@` 引用项目文件、`#` 引用同一项目里的其他会话，Agent 按需读取而不是整段塞进上下文；支持上传附件和选中回复添加评论，旁问可以带着当前上下文临时提问而不进入主对话，也可以从任意一条回复分支出新会话
- **Agent 编排**：主 Agent 可以派出上下文独立、工具相同的子 Agent 并行处理子任务，子会话可在只读标签中查看，可在「设置 › 内置能力」中关闭；也可以读取同一项目内其他会话的对话，比如派子 Agent 总结另一个会话
- **异步执行**：长时间的命令（开发服务器、构建）和子 Agent 可以放到后台运行，结束后结果自动回到会话，Agent 会接着处理；运行中的后台任务显示在输入框工具栏，可随时停止。Agent 回答时还可以继续发送消息补充要求，消息在当前工具执行完后送达，送达前可撤回到输入框
- **Remote project**：把远端服务器目录登记为项目，通过 SSH 建立连接后，Wilthy 上传 helper runtime 维持本机与服务器之间的稳定通道，Agent 的读写与命令直接在服务器上执行，远端目录变化实时同步到文件树，远端文件可在应用内预览与下载
  共享 HOME 的多个节点可以分别建立连接，helper 运行状态按节点保存。
- **会话导出**：会话顶部的「导出会话」可将当前分支保存为 ZIP，内含精简的 `session.jsonl` 聊天记录、图片、上传附件、文件引用和回复评论，可交给其他 Agent 接续工作；导出包含工具调用和结果，分享前请检查内容

### 工作台功能

- **Markdown 笔记编辑**：支持对 `.md` 文件即时渲染编辑，支持数学公式与 mermaid 流程图
- **文件编辑**：任意文本文件都能打开编辑（包括 `.env`、`Makefile`、无后缀日志），按内容而不是扩展名识别；1 MB 以上只读预览
- **内置终端**：跟随系统 shell（Windows 优先 PowerShell 7，macOS 为登录 shell），如果是 remote project 则默认为 ssh，默认继承项目目录作为启动路径

## 技术栈

![Electron](https://img.shields.io/badge/Electron-v44-47848F?style=for-the-badge&logo=electron&logoColor=white&labelColor=1F2328)
![React](https://img.shields.io/badge/React-v19-087EA4?style=for-the-badge&logo=react&logoColor=white&labelColor=1F2328)
![TypeScript](https://img.shields.io/badge/TypeScript-v7-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=1F2328)
![Vite](https://img.shields.io/badge/Vite-v8-646CFF?style=for-the-badge&logo=vite&logoColor=white&labelColor=1F2328)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white&labelColor=1F2328)
![Pi](https://img.shields.io/badge/Pi-v1.1-1E293B?style=for-the-badge&logoColor=white&labelColor=1F2328)
![Go](https://img.shields.io/badge/Go-v1.22-00ADD8?style=for-the-badge&logo=go&logoColor=white&labelColor=1F2328)

## 下载安装

Wilthy 暂未发布安装包，也不会自动检查更新；请按下面的步骤从源码构建。

## 本地开发

从 `dev` 创建功能分支，贡献 PR 统一提交到 `dev`；只有仓库管理员可以发起 `dev` → `main` 的 PR。详见 [贡献指南](CONTRIBUTING.md#分支与合并流程)。

推荐使用 [`.node-version`](.node-version) 指定的 Node.js 与 [`package.json`](package.json) 的 `packageManager` 指定的 pnpm，兼容范围见 `engines`（本机可用 `. ./scripts/use-local-tools.ps1` 启用仓库内固定版本）：

```sh
pnpm install
pnpm dev
```

| 命令                | 用途                                                  |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | 启动开发服务器和窗口，监听主进程/preload 变更         |
| `pnpm build`        | 类型检查与 main/preload/renderer 三入口生产构建       |
| `pnpm test`         | Vitest 单元测试                                       |
| `pnpm smoke`        | Electron 内 SQLite、React 渲染与 preload 隔离冒烟检查 |
| `pnpm package:dist` | 生成 Windows 安装包                                   |

环境搭建、冒烟测试、代码组织约定与发布流程见 [贡献指南](CONTRIBUTING.md)。

## 文档

| 文档                        | 内容                               | 读者           |
| --------------------------- | ---------------------------------- | -------------- |
| [使用条款](docs/terms.md)   | 软件性质、责任划分与免责范围       | 使用者         |
| [隐私条款](docs/privacy.md) | 数据存放位置与联网去向             | 使用者         |
| [更新日志](CHANGELOG.md)    | 按版本分节的变更记录               | 贡献者         |
| [贡献指南](CONTRIBUTING.md) | 环境准备、测试、提交规范与发布流程 | 贡献者（先读） |
| [安全策略](SECURITY.md)     | 漏洞报告渠道、支持范围与安全边界   | 使用者、贡献者 |

## 许可与致谢

本项目以 GNU General Public License v3.0（GPL-3.0-or-later）发布，全文见 [LICENSE](LICENSE)。

Wilthy 基于 [Dela](https://github.com/Chang-Yo/Dela)（GPL-3.0-or-later）修改，自 2026-11-25 起独立维护。感谢 Dela 的作者与贡献者，原有的版权声明随源码保留，名单见应用内「设置 › 关于」。
