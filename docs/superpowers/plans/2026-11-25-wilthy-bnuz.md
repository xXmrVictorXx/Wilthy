# Wilthy BNUZ 改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Dela 改名为 Wilthy，并把 `src/sjtu` 的交大模块替换为 BNUZ 的校园模块：CAS 登录、邮箱、课表、教务通知、成绩、培养方案。

**Architecture:** 采用设计文档的 M1 + R1 方案。原地把 `src/sjtu` 改名为 `src/bnuz`，保留可复用模块的契约、页面、数据表和 Agent 命令域，只重写对接学校的 `main/` 部分；成绩和培养方案按 `timetable` 的结构新建模块。所有教务请求都经 `bnuz/campus` 的 `campusRequest` 发出，并统一带上 Referer、按 GBK 解码。

**Tech Stack:** Electron 44、React 19、TypeScript 7、Vite 8、Vitest、better-sqlite3、cheerio、zod 4、TanStack Query；构建依赖 pnpm 12.3.4 和 Node 24.22.1。

**Spec:** `docs/superpowers/specs/2026-11-25-wilthy-bnuz-design.md`

## Global Constraints

- 产品名 `Wilthy`；appId `io.wilthy.desktop`；配置目录 `~/.wilthy`；数据库 `wilthy.db`；Agent 命令 `wilthy`；环境变量前缀 `WILTHY_`；样式类名前缀 `wilthy-`；校园会话分区 `persist:wilthy-campus`；helper 二进制名 `wilthy-helper*`。
- 除 `LICENSE`、致谢和「基于 Dela 修改」声明外，代码里不再出现 dela。
- 自动更新关闭：删除 `electron-builder.yml` 的两处 `publish` 配置；`updatesAvailable()` 一律返回 false。
- 遵守 `AGENTS.md` 和 `CONTRIBUTING.md` 的架构规则。`core`、`modules`、`app` 不能引用 `bnuz`，例外是 `app/modules.ts` 和 `app/views.ts` 两份清单。
- 默认不用 Effect；不手写 `useMemo` 和 `useCallback`；界面只用 `ui` 组件和 design token。
- 测试样例不得包含真实的学号、姓名、教师名或成绩，统一用 `<学号>`、`张三`、`李老师` 这类占位符。
- 教务请求都带 `Referer: https://jwxt.bnuzh.edu.cn/frame/homes.html`，响应按 GBK 解码。
- 学期内部编码保持 `YYYY-YYYY-N`（N：1 秋、2 春、3 夏）。对应教务参数：`xn = 起始年`，`xq = N - 1`。
- 节次时间（单位：分钟）：1 08:00–08:45，2 08:55–09:40，3 10:00–10:45，4 10:55–11:40，5 13:30–14:15，6 14:25–15:10，7 15:30–16:15，8 16:25–17:10，9 18:00–18:45，10 18:55–19:40，11 19:50–20:35，12 20:45–21:30；第 99 节为中午 11:50–13:20。
- 每个任务结束时都要通过 `pnpm lint`、`pnpm typecheck` 和 `pnpm test`。改了主进程或清单的任务，还要再跑 `pnpm smoke`。提交前先运行 `pnpm format`。
- 提交信息遵循 Conventional Commits，并以 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 结尾。`AGENTS.md` 是用户自己的改动，不要一起提交。

## Review Focus

1. **一门课在一个时间地点格子里有多段时间**，例如 `[1-5,7,9-11周]9-10节 理工2号楼410` 后面接着 `[6,8周]9-10节 …`。每一段都要拆成独立的上课记录，周次不能合并错。→ 由 Task 7 的 `parseBnuzSlots` 测试覆盖。
2. **会话过期时教务系统返回 200 加 405 错误页，或者跳回 CAS**，不能被当成「没有数据」静默接受。→ 由 Task 4 的 `isJwxtLoginPage` 测试覆盖。
3. **原始成绩没带 token 时返回「没有检索到记录!」**，不能被当成「成绩为空」写进数据库，把已有缓存清空。→ 由 Task 10 的测试覆盖：空结果要抛错，不能返回空数组。
4. **DataTable 解析条数和 `showTotalRecord` 不一致**（页面结构变了）时必须报错。→ 由 Task 11 的测试覆盖。
5. **第 99 节（中午）和 12 节以后的节次**，课表要能正常显示，不能越界崩溃。→ 由 Task 7 和 Task 8 的测试覆盖。

---

## 阶段 0：环境

### Task 0: 准备本地工具链

- [ ] 按 `.node-version` 安装 Node 24.22.1，按 `packageManager` 安装 pnpm 12.3.4，都放进 `.tools/`。这个目录已被 gitignore，用 `scripts/use-local-tools.ps1` 启用。
- [ ] 运行 `pnpm install`。
- [ ] 在动任何代码之前，先跑一遍 `pnpm typecheck`、`pnpm test` 和 `pnpm lint`，记下基线：哪些测试原本就失败。

## 阶段 1：改名与应用身份

### Task 1: 身份层与自动更新

**Files:**

- Modify: `package.json`（`name: "wilthy"`，`author: "Wilthy contributors"`，`description`），`electron-builder.yml`（`appId`、`productName`、图标文件名，删除两处 `publish`），`src/modules/update/main/updater.ts`（`updatesAvailable` 返回 false，删除 `DOWNLOAD_PAGE_URL` 及其用途），`src/core/config-files.ts`、`src/core/capabilities/skills.ts`（`.wilthy`），数据库文件名 `dela.db` 出现的所有位置
- Rename: `assets/Dela_*` → `assets/Wilthy_*`，同步改所有 import 和 `src/app/main/index.ts` 里的 `` `Dela_${…}_bg.png` ``

- [ ] 用 `grep -rn "dela.db\|'\.dela'\|io.dela\|Dela_"` 找出全部位置并修改。
- [ ] 更新模块原有的测试里，凡是断言「支持更新」的，改为断言 `unsupported`；只验证已删功能「不存在」的测试，直接删掉，不改写成墓碑测试。
- [ ] 运行 `pnpm typecheck && pnpm test && pnpm smoke`，预期全部通过，冒烟检查能加载 `Wilthy_white_bg.png` 和 `Wilthy_black_bg.png`。
- [ ] 提交：`chore: rename app identity to Wilthy and disable auto update`

### Task 2: 内部标识批量改名

**Files:**

- Create: `scripts/rename-to-wilthy.ts`（一次性脚本，提交后删除）
- Modify: 所有包含 `dela`、`Dela`、`DELA` 的源码、脚本、Go helper、CI 工作流

- [ ] 写好脚本：按大小写分别替换 `dela`→`wilthy`、`Dela`→`Wilthy`、`DELA`→`WILTHY`，只替换完整单词或带分隔符的标识，例如 `dela-helper`、`DELA_COMMAND_URL`、`.dela`。排除 `node_modules`、`.git`、`LICENSE`、`LICENSES/`、`assets/credits`、`CHANGELOG.md`，以及 `src/modules/settings/view/credits.ts` 里的原作者 GitHub 地址。
- [ ] 运行脚本，再用 `grep -rniw dela` 检查剩下的内容：应该只剩致谢和许可证。
- [ ] Go helper：如果本机有 Go 1.22，就运行 `pnpm build:helper` 重新生成 `vendor/` 里的产物；没有的话，把 `helper.yml` 工作流当作发版前的必做项，写进提交说明。
- [ ] 删除改名脚本，然后运行 `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke`，全部通过。
- [ ] 提交：`refactor: rename internal dela identifiers to wilthy`

## 阶段 2：清理与目录迁移

### Task 3: 删除无对应系统的模块，sjtu 改名为 bnuz

**Files:**

- Delete: `src/sjtu/canvas/`、`src/sjtu/classroom/`、`src/sjtu/shuiyuan/`、`scripts/run-shuiyuan-perf.ts`、`scripts/shuiyuan-*`，以及 `package.json` 里的 `smoke:shuiyuan`
- Rename: `src/sjtu/` → `src/bnuz/`；`scripts/strip-sjtu.ts` → `scripts/strip-bnuz.ts`（正则改成匹配 `../bnuz/`）
- Modify: `src/app/modules.ts`、`src/app/views.ts`（去掉三个模块，路径改为 `../bnuz/`），`.github/workflows/test.yml`，`scripts/lint-*.ts` 和 `tsconfig*.json` 里的 `sjtu` 路径，`CONTRIBUTING.md` 的「架构」一节（目录树、依赖规则第 4 条，以及「交大」改成「BNUZ」）
- 通用模块里如有专为 Canvas、水源、课堂视频开的注册口，只要还有通用价值就保留，不删。

- [ ] 删除模块后，用 `grep -rn "canvas\|shuiyuan\|classroom" src` 找出残留的引用并清理，包括引导步骤和设置项。
- [ ] 运行 `node scripts/strip-bnuz.ts`，确认在临时副本里能去掉 `bnuz` 模块。然后在正常树上跑 `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke`，全部通过。
- [ ] 提交：`refactor: drop SJTU-only modules and move campus modules to src/bnuz`

## 阶段 3：CAS 登录与邮箱预设

### Task 4: CAS 会话与教务请求

**Files:**

- Modify: `src/bnuz/campus/main/session.ts`、`src/bnuz/campus/index.ts`
- Create: `src/bnuz/campus/main/jwxt.ts`
- Test: `src/bnuz/campus/main/test/jwxt.test.ts`

**Interfaces（Produces）：**

- `campusCookie` 的判断改为：域名是 `bnuzh.edu.cn` 或以 `.bnuzh.edu.cn` 结尾。
- `CampusRequestOptions` 增加可选字段 `encoding?: 'utf8' | 'gbk'`。
- `jwxt.ts` 导出：
  - `JWXT_ORIGIN = 'https://jwxt.bnuzh.edu.cn'`
  - `CAS_LOGIN_URL = 'https://cas.bnuzh.edu.cn/cas/login?service=https%3A%2F%2Fjwxt.bnuzh.edu.cn%2Fcaslogin'`
  - `isJwxtLoginPage(html: string): boolean`
  - `jwxtRequest(path: string, init?: { method?: 'GET' | 'POST'; form?: Record<string, string> }): Promise<string>`：带上 Referer 并按 GBK 解码；被重定向或识别为登录页时抛出 `CampusAuthError`；遇到 `CampusAuthError` 时先调一次 `hiddenCampusLogin(CAS_LOGIN_URL, probe)` 再重试一次。
  - `jwxtToken(page: string): Promise<string>`：`POST /frame/menus/js/SetTokenkey.jsp`，表单 `menucode=<page>`，去掉响应里的所有空白。
  - `currentTerm(): Promise<{ semester: string; studentId: string }>`：调用 `POST /jw/common/showYearTerm.action`，`xn` 和 `xqM` 换算成内部学期，`userCode` 作为学号。
  - `toJwxtTerm(semester: string): { xn: string; xn1: string; xq: string }`
  - `openJwxtLoginWindow(sender: WebContents): Promise<{ ok: boolean; error?: string }>`：`reached` 条件是 URL 以 `https://jwxt.bnuzh.edu.cn/frame/` 开头；`probe` 调用 `currentTerm()` 和 `flushCampusSession()`。

- [ ] 写失败的测试：
  - `isJwxtLoginPage` 对 405 错误页片段（含「无效访问请求」）、CAS 登录页片段（含 `cas.bnuzh.edu.cn/cas/login`）返回 true，对普通课表片段返回 false。
  - `toJwxtTerm('2026-2027-1')` 返回 `{ xn: '2026', xn1: '2027', xq: '0' }`；`'2025-2026-2'` 的 `xq` 为 `'1'`。
- [ ] 运行 `pnpm vitest run src/bnuz/campus`，预期失败。
- [ ] 实现上述接口。GBK 解码用 `new TextDecoder('gbk')`。
- [ ] 测试通过后，删除 `session.ts` 注释里提到交大的内容。
- [ ] 提交：`feat(campus): sign in through BNUZ CAS and call jwxt with GBK and referer`

### Task 5: 邮箱预设

**Files:** Modify: `src/bnuz/mail/view/index.ts`

- [ ] `registerMailPreset` 的参数改为 `{ label: '北师邮箱', domain: 'mail.bnu.edu.cn', server: { imapHost: 'imaphz.qiye.163.com', imapPort: 993, smtpHost: 'smtphz.qiye.163.com', smtpPort: 465 }, passwordHint: '客户端授权码（在网页邮箱设置中开启 IMAP/SMTP 后生成）' }`。
- [ ] 运行 `pnpm typecheck`，通过。
- [ ] 提交：`feat(mail): add BNU mail preset`

### Task 6: 手动验证登录和邮箱

- [ ] 运行 `pnpm dev`，在设置里连接数字京师·珠海，由用户本人登录，确认能拿到学期和学号。
- [ ] 用户填入客户端授权码，确认能收信和发信。把结果写进下一个提交的说明里。

## 阶段 4：课表

### Task 7: 课表解析

**Files:**

- Create: `src/bnuz/timetable/main/parse.ts`
- Test: `src/bnuz/timetable/main/test/parse.test.ts`
- Delete: `src/bnuz/timetable/main/graduate.ts`，以及只测它的测试

**Interfaces（Produces）：**

- `parseBnuzSlots(text: string): Array<{ weeksText: string; weekNumbers: number[]; weekday: number | null; startPeriod: number; endPeriod: number; classroom: string | null }>`：解析「上课时间、地点」一格。
- `parseTimetableList(html: string, semester: string): ParsedLesson[]`：`ParsedLesson` 的字段和 `api.ts` 现有插入语句的命名参数一致。
- 继续沿用 `api.ts` 里的 `parseWeekNumbers`。

- [ ] 写失败的测试（样例全部使用占位符）：
  - `[1-5,7,9-11周]9-10节 理工2号楼410` 解析为周次 `[1,2,3,4,5,7,9,10,11]`、第 9–10 节、地点 `理工2号楼410`。
  - `6-12周(双) [ ]` 解析为周次 `[6,8,10,12]`，地点为 null。
  - 一格里有两段时间时，得到两条记录。
  - 含第 99 节时，`startPeriod` 为 99。
  - `parseTimetableList` 读一个两门课的列表片段：课程号 `GEN09007`、课程名、学分 `0.25`、教师 `李老师`。
- [ ] 运行测试，预期失败。
- [ ] 实现解析。星期几的来源以真实列表为准：列表里如果没有星期列，就同时请求周视图网格 `/student/wsxk.xskcb10319.jsp`，按格子位置定星期。实现前先用真实页面确认，并在测试里补一个对应的片段。
- [ ] 运行测试，通过。
- [ ] 提交：`feat(timetable): parse BNUZ jwxt timetable list`

### Task 8: 课表同步、校历与节次

**Files:**

- Modify: `src/bnuz/timetable/main/api.ts`、`src/bnuz/timetable/contract.ts`（`classPeriods`）、`src/bnuz/timetable/main/schedule.ts`（支持第 99 节）、`src/bnuz/timetable/index.ts`（设置搜索关键词）、`src/bnuz/timetable/view/*`（文案：教学信息服务网 → 教务系统，jAccount → 数字京师·珠海）
- Test: `src/bnuz/timetable/main/test/schedule.test.ts`（改写现有测试）

**Interfaces：**

- Consumes：Task 4 的 `jwxtRequest`、`currentTerm`、`toJwxtTerm`、`openJwxtLoginWindow`；Task 7 的 `parseTimetableList`。
- Produces：
  - `fetchSemesterStart(semester): Promise<string | null>`，调用 `getDateByTeachingWeek.action?hidOption=FOW&xn&xq&zc=1&xnq=1`。
  - `currentSemester` 改为异步，从 `currentTerm()` 获取；拿不到时回退到原来按月份推算的结果。
  - `classPeriods`：12 个节次按 Global Constraints 的时间；第 99 节单独导出为常量 `NOON_PERIOD = { period: 99, start: 11 * 60 + 50, end: 13 * 60 + 20 }`。

- [ ] 改写 `schedule.test.ts`：
  - 学期开始日期为 `2026-09-07` 时，「第 12 周周三第 1–2 节」换算为 `2026-11-25T08:00+08:00` 到 `09:40`。
  - 第 99 节换算为 11:50–13:20。
- [ ] 运行测试，预期失败。
- [ ] 实现：同步时写入 `semester_start`；保留手动设置学期开始日期的入口。
- [ ] 运行 `pnpm test && pnpm typecheck`，通过。用户手动验证课表页显示正确。
- [ ] 提交：`feat(timetable): sync BNUZ timetable, calendar and periods`

## 阶段 5：教务通知

### Task 9: 教务部通知源

**Files:**

- Modify: `src/bnuz/jwc/main/jwc.ts`、`src/bnuz/jwc/contract.ts`（删除 `captcha` 和 `download`，`noticeId` 改为 `/^jwc:[0-9a-f]{32}$/`），`src/bnuz/jwc/view/JwcNoticeView.tsx`（附件直接用外部链接打开，删除验证码界面）
- Test: `src/bnuz/jwc/main/test/jwc.test.ts`（改写）

**Interfaces：**

- `parseJwcList(html, pageUrl)`：每一行是 `li.line > a[href][title]` 加 `span.text-muted`（日期）。`id` 为 `jwc:<32 位十六进制>`；标题取 `title` 属性；日期格式 `YYYY-MM-DD`；下一页链接是文字为「下一页」的 `<a>`。链接指向其他栏目时（如 `../sjjx/...`），一样收录。
- `getJwcNotice`：正文取 `.contenttxt`，附件取正文里指向 `.pdf/.doc/.docx/.xls/.xlsx/.zip` 的链接。
- `origin = 'https://jwb.bnuzh.edu.cn'`，`listUrl = ${origin}/tzgg/index.htm`。

- [ ] 写失败的测试，用两行列表片段：标题用 `title` 属性而不是被截断的 span 文本；跨栏目链接能解析成绝对地址；`next` 为 `index1.htm` 的绝对地址。
- [ ] 运行测试，预期失败；实现后再跑，通过。
- [ ] 提交：`feat(jwc): read notices from BNUZ academic affairs site`

## 阶段 6：成绩与培养方案

### Task 10: 成绩模块（主进程）

**Files:**

- Create: `src/bnuz/grades/{index.ts,contract.ts,data/schema.ts,main/api.ts,main/parse.ts,main/agent/index.ts,main/agent/query-grades.ts,main/agent/skill/SKILL.md}`
- Test: `src/bnuz/grades/main/test/parse.test.ts`
- Modify: `src/app/modules.ts`

**Interfaces（Produces，写在 `contract.ts`）：**

```ts
export interface GradeRecord {
  readonly semester: string;
  readonly courseCode: string;
  readonly courseName: string;
  readonly credits: number;
  readonly earnedCredits: number | null;
  readonly category: string;
  readonly nature: string;
  readonly assessment: string;
  readonly status: string;
  readonly score: string;
  readonly gradePoint: number | null;
  readonly minor: boolean;
  readonly note: string | null;
  readonly components: {
    usual: string | null;
    midterm: string | null;
    final: string | null;
  } | null;
}
export interface GradesState {
  readonly lastSyncedAt: string | null;
}
export const gradesContract = defineContract('grades', {
  state: { input: z.undefined(), output: z.custom<GradesState>() },
  list: { input: z.undefined(), output: z.custom<GradeRecord[]>() },
  sync: {
    input: z.undefined(),
    output: z.custom<{ ok: boolean; error?: string; reason?: 'auth' }>(),
  },
});
// NavTargets: grades: {}
```

- 数据表：`grades_records`（字段对应 `GradeRecord`，`components` 存 JSON）和 `grades_sync(id INTEGER PRIMARY KEY CHECK (id = 1), last_synced_at TEXT NOT NULL)`。
- `parseValidGrades(html): GradeRecord[]`：解析有效成绩表，学年学期文本（如「2023-2024学年秋季学期」）换算成内部学期编码。
- `parseRawGrades(html): Map<string, GradeRecord['components']>`：key 是 `学期|课程号`。
- 同步流程：先取有效成绩，再用 `jwxtToken('xscj.stuckcj.my.jsp')` 取原始成绩，把分项合并进去；在一个事务里整表替换。
- Agent 命令：`query_grades`，输入 `{ semester?: string; course?: string }`，返回匹配的成绩记录、总学分、实得学分，以及按学分加权的平均绩点（`gradePoint` 为 null 的课程不计入）。

- [ ] 写失败的测试，样例全部使用占位符：
  - 有效成绩片段能解析出 2 条记录，学期为 `2023-2024-1`，绩点为数字。
  - 原始成绩片段里能解析出平时、期中、期末成绩。
  - 页面内容为「没有检索到记录!」时，`parseRawGrades` 抛出 `Error('原始成绩为空，可能是登录或口令失效')`。
- [ ] 运行测试，预期失败；实现后再跑，通过。
- [ ] Skill 内容：说明 `wilthy query_grades` 的用法；成绩是敏感数据，只在用户询问时读取；平均绩点的口径。
- [ ] 运行 `pnpm typecheck && pnpm test && pnpm smoke`。
- [ ] 提交：`feat(grades): sync BNUZ grades and expose query_grades`

### Task 11: 培养方案模块（主进程）

**Files:**

- Create: `src/bnuz/program/{index.ts,contract.ts,data/schema.ts,main/api.ts,main/parse.ts,main/agent/index.ts,main/agent/query-program.ts,main/agent/skill/SKILL.md}`
- Test: `src/bnuz/program/main/test/parse.test.ts`
- Modify: `src/app/modules.ts`

**Interfaces（Produces）：**

```ts
export interface PlannedCourse {
  readonly semester: string;
  readonly courseCode: string;
  readonly courseName: string;
  readonly credits: number;
  readonly category: string;
  readonly assessment: string;
  readonly hours: number;
}
export interface ModuleCourse {
  readonly module: string;
  readonly courseCode: string;
  readonly courseName: string;
  readonly credits: number;
  readonly term: string;
  readonly score: string | null;
  readonly selected: boolean;
}
export const programContract = defineContract('program', {
  state: { input: z.undefined(), output: z.custom<{ lastSyncedAt: string | null }>() },
  plan: { input: z.undefined(), output: z.custom<PlannedCourse[]>() },
  progress: { input: z.undefined(), output: z.custom<ModuleCourse[]>() },
  sync: {
    input: z.undefined(),
    output: z.custom<{ ok: boolean; error?: string; reason?: 'auth' }>(),
  },
});
// NavTargets: program: {}
```

- `parseDataTable(html: string, tableId: string): string[][]`：返回表头之后的所有行（每行是若干单元格文本）。行数和 `showTotalRecord('<tableId>','<n>')` 里的 n 不一致时，抛出 `Error('培养方案表格条数不一致')`。
- 请求：
  - 理论课程：`POST /taglib/DataTable.jsp?tableId=2508`，表单 `{ xh, menucode_current: 'JW130301' }`。
  - 对比表：`POST /taglib/DataTable.jsp?tableId=5327008`，表单 `{ xh, xn, xq_m, xn1, _xq, ck_px: 'akcmk', menucode_current: 'JW130413' }`。学号来自 `currentTerm()`。
- 「应修学分」：实现前先用真实页面确认对比表里有没有模块小计行。有就解析，并在 `ModuleCourse` 之外补充每个模块的应修学分；没有就不显示（设计文档 5.4）。
- Agent 命令：`query_program`，返回按模块汇总的已修学分和未修课程清单。

- [ ] 写失败的测试：
  - 带 `showTotalRecord('2508','2')` 的两行片段，解析出 2 行。
  - 条数写成 `'3'` 时抛错。
  - 对比表一行「通识课程/体育与健康类/必修 | KCZ012 | 三自选项课程（23版） | 3.00 | 48 | 一 | | 」能映射成 `ModuleCourse`。
- [ ] 运行测试，预期失败；实现后再跑，通过。
- [ ] 提交：`feat(program): sync BNUZ training program and expose query_program`

### Task 12: 成绩和培养方案页面

**Files:**

- Create: `src/bnuz/grades/view/{index.ts,GradesView.tsx,use-grades.ts}`、`src/bnuz/program/view/{index.ts,ProgramView.tsx,use-program.ts}`
- Modify: `src/app/views.ts`

- [ ] 先读 `src/ui/README.md` 和 `src/bnuz/timetable/view/TimetableView.tsx`，沿用它们的写法：TanStack Query 读数据，用 `ui` 组件，未连接时显示「连接数字京师·珠海」卡片，同步失败且 `reason === 'auth'` 时引导重新登录。
- [ ] 成绩页按设计文档 5.4 的草图：
  - 顶部汇总：总学分、实得学分、平均绩点，并注明「按学分加权」。
  - 「有效」和「原始」两个视图切换，原始视图多出平时、期中、期末三列。
  - 成绩按学期分组，最近的学期在前。
- [ ] 培养方案页分「按模块」和「按学期」两个标签页：
  - 按模块：每组显示已修学分。如果拿到了应修学分，再显示进度条。
  - 按学期：列出该学期的计划课程。
- [ ] 两个页面都要在 `pages` 里登记导航入口（图标 `GraduationCap` 和 `ListChecks`），保证能在「导航入口」设置里隐藏。
- [ ] 运行 `pnpm typecheck && pnpm lint && pnpm smoke`。用户在 `pnpm dev` 里手动验证两个页面。
- [ ] 提交：`feat(grades,program): add grades and training program pages`

## 阶段 7：文档与品牌

### Task 13: 对外文档、关于页与致谢

**Files:**

- Modify: `README.md`、`CONTRIBUTING.md`、`SECURITY.md`、`docs/terms.md`、`docs/privacy.md`、`docs/what-we-not-do.md`、`src/modules/settings/view/AboutSection.tsx`、`src/modules/settings/view/credits.ts`
- Delete: `assets/sponsors/`，以及其他只属于原作者的赞助素材和二维码

- [ ] README：介绍 Wilthy 和 BNUZ 功能，写明「基于 Dela（GPL-3.0-or-later）修改，2026-11-25 起」；保留许可证章节；删除 Dela 官网、下载链接和赞助鸣谢。
- [ ] 隐私条款列出数据去向：`cas.bnuzh.edu.cn`、`jwxt.bnuzh.edu.cn`、`jwb.bnuzh.edu.cn`、网易企业邮。
- [ ] 关于页：在用户给出仓库地址之前，不放外链；致谢原作者时写「基于 Dela 修改」，不放原作者的收款码。
- [ ] 运行 `scripts/generate-intro-lettering.py`，把引导动画的手写字样重新生成为「Wilthy」。如果缺字体或依赖，就把这一项列为待办写进提交说明。
- [ ] 运行 `pnpm format:check && pnpm lint && pnpm build && pnpm test`，通过。
- [ ] 提交：`docs: describe Wilthy for BNUZ and credit Dela`
