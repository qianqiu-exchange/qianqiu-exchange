# 千秋交易所 · BYOK 开源共创社区路线图

## 核心边界

- **人和 AI Agent 都是一等贡献者**：人可以用表单和时间线编辑，Agent 可以读机器可读剧本、校验协议和变更清单。
- 游戏核心离线运行、BYOK 可选；平台不保存用户 API Key，不用官方代付 token。
- 零托管社区优先：通过 GitHub 仓库和静态生成的剧本 Registry 展示审核通过的贡献，避免建立官方账户数据库和重型服务器。
- 用户本地存档与私人游戏数据不自动同步、不自动上传，投稿必须明确批准和审阅 Diff。

## 三层产品结构

### 1. 本地创作者工作台（当前 V0.1）

- 可编辑结构化 JSON 剧本；校验引用、权重、结算条件、来源字段。
- BYOK 生成**待审核的公开情报文本建议**，展示变更前后差异，只有批准后修改草稿。
- 可导出剧本 JSON 和本地存档 JSON。没有官方服务端或账号。

### 2. Agent 原生创作协议（V0.2 规划）

- 以 JSON Schema 标准化 Scenario、Contract、Character、Round、News、Asset、License。
- 本地 CLI：`validate scenario`, `check chronology`, `simulate seed`, `audit ledger`, `package`, `create contribution`。
- AI 只能输出结构化 `ChangeProposal`，例如 `add_character`、`add_contract`、`modify_news`；全部通过白名单操作转换为 Diff，禁止 AI 直接执行脚本或写系统文件。
- 区分 `historical_claims`（需来源）与 `game_design`（可主观设计），事件结算要求至少一个可复核的史料锚点。
- 完整测试种子集和版本迁移规则；旧存档始终绑定原剧本版本。

### 3. 开源社区 Registry（V0.3 规划）

- 每个投稿由一个独立目录和 `manifest.json` 描述，包含 id/version/author/license/dependencies/sources/hash。
- 用户在自己的 GitHub 仓库或本地生成贡献包；可手动发起 GitHub PR。官方不自动获取 GitHub OAuth token。
- GitHub Actions 校验 schema、合约结算、年代一致性、资源来源、许可证、安全审查、模拟经济稳定性。
- 维护者决定合并、拒绝或退回。合并后 CI 自动生成静态 JSON Registry；网站从公开静态索引提供搜索和下载。
- 可选本地 Agent CLI 对 Registry 同样可读，不把 Agent 当作只能操作网页的辅助工具。

## 版本最小原则

先完成 **一个能重复玩、资金账本可靠、易于修改的本地游戏**；之后优先实现机器可读的版本化剧本和贡献工具；社区网站、评论、投票、联机竞技应等待真实贡献量和留存数据验证。

## 安全及合规

- 不出售带经济价值的游戏币，不开放提现或真实投注；未审查地区法律前不发布真实资金玩法。
- 模型内容必须经过校验、人工批准、史料审核，不能自动变成官方认可的真实历史事实。
- 外部 URL、模型输出、作者提交的 JSON 均为不可信输入；游戏剧本不得被解释为可执行代码。
- 不能把「静态注册表」说成「实时共创后端」；多人实时合作和讨论需要额外基础设施或外部平台。
