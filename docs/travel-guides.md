# 旅行攻略（travel-guide）

本仓已并入攻略站点能力：

| 路径 | 说明 |
|------|------|
| `guides/<slug>/` | Skill 落盘：`index.html` + `meta.json`（+ 可选 PDF） |
| `public/guides/` | 构建前由 `pnpm sync-guides` 同步，需提交以便 Vercel 静态托管 |
| `/guides` | 攻略列表 |
| `/g/<slug>` | 攻略阅读页（iframe 打开完整 HTML） |

```bash
pnpm sync-guides   # 或包含在 predev / prebuild
pnpm dev
```

推送到 `main` 后，若 Vercel 已绑定本仓库，站点会自动更新。
