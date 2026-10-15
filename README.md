# 逆蝉 · cicadar

个人站点：**旅行攻略**、博客与小工具（后两者陆续开放）。

- 仓库：[Next-Aurora/cicada](https://github.com/Next-Aurora/cicada)
- UI：shadcn **base-nova**（`components/ui`）
- 生产：以 Vercel 项目 [cicada](https://vercel.com/wintersmilesb101s-projects/cicada) 绑定域名为准
- 版本发布：`main` 上 [semantic-release](.github/workflows/release.yml)（Changelog + GitHub Release）；站点上线仍靠 Vercel

## 日常开发

```bash
pnpm install
pnpm sync-guides   # guides/ → public/guides/
pnpm dev
```

| 路径 | 用途 |
|------|------|
| `app/` | Next App Router 站点壳 |
| `components/ui/` | shadcn 组件 |
| `guides/<slug>/` | travel-guide Skill 落盘攻略 HTML |
| `public/guides/` | 同步后的静态文件（需提交） |
| `styles/` | 全局样式与主题 token |
| `.cursor/skills/travel-guide` | 攻略生成 Skill |
| `.cursor/rules/` | AI 开发约定 |

说明文档：

- [旅行攻略](docs/travel-guides.md)
- [Skills 与 MCP](docs/cursor-skills-mcp.md)
- [路线图（含 OTel 计划）](docs/roadmap.md)
- [站点设计备忘](docs/superpowers/specs/2026-09-19-travel-guides-vercel-design.md)

## 生成攻略

用 Cursor **打开本仓库根目录**，走 `travel-guide` Skill。产出写入 `guides/<slug>/`，再：

```bash
pnpm sync-guides
git add guides public/guides && git commit && git push
```
