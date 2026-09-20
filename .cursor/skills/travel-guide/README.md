# travel-guide

旅游推荐 + 攻略生成 Skill：合并 `travel-skill`（场景化玩吃）与 `xhs-travel-skill`（小红书实证 + HTML）精华。

旧目录 `travel-skill`、`xhs-travel-skill` **仍保留作归档**；同仓时 **一律优先本 Skill**（勿并行旧流程）。

**分流摘要**：半天/一日 → 轻量；≥2 天或要 HTML → 攻略。攻略档**一次问卷**（侧重默认均衡、人流默认适中、出发地可待补）；电车必问续航并按季节折损排充电。

## 两档能力

| 档位 | 场景 | 产出 |
|------|------|------|
| 轻量档 | 半日/一日、玩/吃/玩吃、人流偏好 | 对话内可执行路线 |
| 攻略档 | 多日、要攻略/HTML、自驾/假期 | **先粗规划→确认→** HTML + PDF；日卡片总览（顶图+`›`分隔）；正文多图；国内主推 PDF |

## 触发词

去哪玩、去哪吃、旅游攻略、旅行路线、出行规划、自驾游、周末去哪、假期规划、行程安排、几日游、景点推荐、美食推荐、避开人流、半日游、一日游

## 依赖

- **推荐小红书**： [x-mcp](https://github.com/xpzouying/x-mcp)（浏览器插件 + 托管 MCP）
- **备选小红书**： [xpzouying/xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp) 自建
- **推荐天气**： [open-meteo-mcp-server](https://www.npmjs.com/package/open-meteo-mcp-server)（Open-Meteo，**无需 API Key**）
- **可选腾讯文档**：官方 MCP（读/写在线表格与文档，方便与行程表联动）
- 轻量档可选：高德 / 联网搜索（环境有则用）；无天气 MCP 时也可直接调 Open-Meteo HTTP
- **站点**：攻略落盘本仓 `guides/<slug>/`，`pnpm sync-guides` 后 push；见 `docs/travel-guides.md`、`docs/cursor-skills-mcp.md`

配置可写在 **本仓** `.cursor/mcp.json`（已含 open-meteo）或 **Cursor 用户级** `mcp.json`。带 Token 的项用 `.cursor/mcp.json.example` 作模板，**Token 只放本机，勿提交仓库、勿贴进聊天。**

### 1）小红书 x-mcp

```json
{
  "mcpServers": {
    "x-mcp": {
      "url": "https://mcp.aredink.com/mcp",
      "headers": {
        "X-API-Key": "<YOUR_XHS_TOKEN>"
      }
    }
  }
}
```

### 2）腾讯文档 MCP（官方）

官方说明：[MCP 概述](https://docs.qq.com/open/document/mcp/) · [使用指南（腾讯云）](https://cloud.tencent.com/developer/mcp/server/11803)

**步骤：**

1. 浏览器打开 [腾讯文档 MCP 管理](https://docs.qq.com/open/auth/mcp.html)，用 QQ / 微信登录  
2. 生成并 **复制 Token**（仅本机保存）  
3. 打开 Cursor → Settings → MCP，或直接编辑 `~/.cursor/mcp.json`，增加 `tencent-docs`（可与 `x-mcp` 并存）：  

```json
{
  "mcpServers": {
    "x-mcp": {
      "url": "https://mcp.aredink.com/mcp",
      "headers": {
        "X-API-Key": "<YOUR_XHS_TOKEN>"
      }
    },
    "tencent-docs": {
      "url": "https://docs.qq.com/openapi/mcp",
      "headers": {
        "Authorization": "<YOUR_TENCENT_DOCS_TOKEN>"
      }
    }
  }
}
```

4. 保存后 **重启 Cursor / 刷新 MCP**，确认 `tencent-docs` 显示已连接  
5. 在对话里试一句：「用腾讯文档列出我最近的表格」或把 `docs.qq.com/sheet/...` 链接发给 Agent  

**注意：**

- Header 键名用 `Authorization`，值为管理页复制的 Token（不要加多余前缀，除非页面说明要求）  
- 调用有日限额（免费 / 会员不同，以管理页提示为准）  
- 需登录账号对目标文档有权限，才能读、写你的行程表  
- 常见工具：`get_content`、`batch_update_sheet_range`、`search_space_file` 等（以 MCP `tools/list` 为准）

### 3）天气 MCP（Open-Meteo · 推荐）

仓库 / 包：[cmer81/open-meteo-mcp](https://github.com/cmer81/open-meteo-mcp) · npm `open-meteo-mcp-server`  
数据源：[Open-Meteo](https://open-meteo.com/)（全球预报，免费、**无需注册 Key**）。

**步骤：**

1. 编辑 `~/.cursor/mcp.json`，增加（可与 `x-mcp` 等并存）：

```json
{
  "mcpServers": {
    "open-meteo": {
      "command": "npx",
      "args": ["-y", "-p", "open-meteo-mcp-server", "open-meteo-mcp-server"]
    }
  }
}
```

2. 保存后 **重启 Cursor / 刷新 MCP**，确认 `open-meteo` 已连接（需本机可跑 `npx` / Node）  
3. 对话试一句：「查柳州 10 月 1–3 日逐日气温和降水」——Agent 应用 MCP 取数，写入攻略每日 `.day-weather`

**无 MCP 时的回退**（Skill 允许）：

```text
https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia/Shanghai&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

城市坐标可用 Open-Meteo 地理编码：`https://geocoding-api.open-meteo.com/v1/search?name=柳州&count=1`。

**注意：**

- 短期预报通常约 **16 天**；更远日期写气候向 +「出行前再核」，勿假装精确  
- 攻略页天气会过时，页内须提示用户出发前再核  
- 不必配环境变量；若自建镜像可按包文档设 `OPEN_METEO_*_API_URL`

## 结构

```text
travel-guide/
├── SKILL.md
├── reference.md
├── examples.md
├── README.md
└── references/
    └── template-example.html
```
## 安装

放到 Agent 的 skills 目录即可，例如 Cursor：

```bash
# 已在本仓库
.cursor/skills/travel-guide
```

## 许可

与仓库内既有 Skill 一致（参考各自 LICENSE）；本目录为项目内合成版说明文档。
