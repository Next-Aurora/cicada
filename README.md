# 蝉 · cicada

个人站点：**旅行攻略**、博客与小工具（后两者陆续开放）。

- 仓库：[Next-Aurora/cicada](https://github.com/Next-Aurora/cicada)
- 生产：以 Vercel 项目 [cicada](https://vercel.com/wintersmilesb101s-projects/cicada) 绑定域名为准

## 日常开发

```bash
pnpm install
pnpm sync-guides   # guides/ → public/guides/
pnpm dev
```

| 路径 | 用途 |
|------|------|
| `guides/<slug>/` | travel-guide Skill 落盘攻略 HTML |
| `public/guides/` | 同步后的静态文件（需提交） |
| `/guides` · `/g/<slug>` | 攻略列表与阅读 |
| `.cursor/skills/` | Cursor Skills（主用 `travel-guide`） |
| `.cursor/mcp.json` | 项目 MCP（含 open-meteo；Token 见 example） |

说明文档：

- [旅行攻略](docs/travel-guides.md)
- [Skills 与 MCP](docs/cursor-skills-mcp.md)
- [站点设计备忘](docs/superpowers/specs/2026-09-19-travel-guides-vercel-design.md)

## 生成攻略

用 Cursor **打开本仓库根目录**，走 `travel-guide` Skill。产出写入 `guides/<slug>/`，再：

```bash
pnpm sync-guides
git add guides public/guides && git commit && git push
```

旧仓库 `travel-skills` / `SmileSB1O1/cicada` 的 `web/` 子应用已停用，请只在本仓作业。

---

以下为原 Next.js Enterprise Boilerplate 说明（基础设施仍可用）。

# Next.js Enterprise Boilerplate

A production-ready template for building enterprise applications with Next.js. See upstream [Blazity next-enterprise](https://github.com/Blazity/next-enterprise) and [docs.blazity.com](https://docs.blazity.com) for the full boilerplate feature list (Storybook, Vitest, Playwright, etc.).
