# 凌风蝉微信登录小程序

给微信内置浏览器里的站点登录页使用：网页拉起本小程序，用户授权后站点用小程序 `openid` 建会话。

## 配置

1. 在微信公众平台注册小程序，拿到 AppID / AppSecret。
2. 把 `project.config.json` 里的 `appid` 改成真实 AppID。
3. 把 `config.js` 的 `apiBaseUrl` 改成站点源（如 `https://www.cicadar.cn`）。
4. 小程序后台「开发 → 开发管理 → 开发设置 → 服务器域名」的 request 合法域名填同一源。
5. 站点 `.env` 填入：

```bash
WECHAT_MINI_APP_ID=...
WECHAT_MINI_APP_SECRET=...
# 体验版调试时可设 WECHAT_MINI_ENV_VERSION=trial
```

6. 用微信开发者工具打开本目录并上传；正式环境使用正式版，体验版则把 `WECHAT_MINI_ENV_VERSION` 设为 `trial`。

## 说明

- 不依赖微信开放平台认证；用户身份是本小程序的 `openid`。
- 未登录用户：小程序只做微信授权；回到网页后**必须**绑定登录方式（当前仅邮箱，接口已预留手机号）。
- 已有邮箱则验证密码并合并；没有则用该邮箱为当前微信账号设置密码。
- 网页已登录邮箱账号时再点微信：会把微信绑到当前邮箱账号。
- 以后若要和网站应用 / 服务号打通用户，再认证开放平台并用 `unionid`。
