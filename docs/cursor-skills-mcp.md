用 Cursor **打开本仓库根目录**（cicada）。旧仓 `travel-skills` 已停用。

## Skills

`.cursor/skills/` 已包含：

| Skill | 说明 |
|-------|------|
| **travel-guide** | 主用：玩吃推荐 + HTML 攻略（优先） |
| travel-skill | 归档 |
| xhs-travel-skill | 归档 |

攻略落盘：`guides/<slug>/` → `pnpm sync-guides` → push。

## MCP

- **已入库（无密钥）**：`.cursor/mcp.json` 含 `open-meteo`（天气，无需 Key）
- **带 Token 的模板**：复制 `.cursor/mcp.json.example` → 合并进本地 `mcp.json` 或用户级 `%USERPROFILE%\.cursor\mcp.json`，填入 `X-API-Key` / 腾讯文档 Token  
- **禁止**把真实 Token 提交进 git

Cursor Settings → MCP 刷新后即可使用。详情见 `.cursor/skills/travel-guide/README.md`。
