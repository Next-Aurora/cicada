import type { Locale } from "@/lib/i18n/locale"

export type Messages = {
  meta: {
    siteTitle: string
    titleTemplate: string
    siteDescription: string
  }
  nav: {
    language: string
    chinese: string
    cantonese: string
    english: string
    signIn: string
    signUp: string
    signOut: string
  }
  home: {
    eyebrow: string
    headline: string
    lead: string
    cta: string
    navLabel: string
    soon: string
    guidesTitle: string
    guidesDesc: string
    guidesMark: string
    blogTitle: string
    blogDesc: string
    blogMark: string
    toolsTitle: string
    toolsDesc: string
    toolsMark: string
  }
  guides: {
    title: string
    description: string
    introBefore: string
    introAfter: string
    emptyTitle: string
    emptyBefore: string
    emptyAfter: string
    emptyEnd: string
    back: string
    open: string
    notFound: string
    fallbackDescription: string
  }
  footer: {
    rights: string
  }
  auth: {
    loginTitle: string
    loginDescription: string
    loginMeta: string
    registerTitle: string
    registerDescription: string
    registerMeta: string
    loading: string
    email: string
    password: string
    nickname: string
    signingIn: string
    signIn: string
    signingUp: string
    signUp: string
    or: string
    githubSignIn: string
    githubSignUp: string
    noAccount: string
    hasAccount: string
    signInFailed: string
    signUpFailed: string
    idleNotice: string
    wechat: string
    wechatOpening: string
    wechatHint: string
    wechatExpired: string
    wechatRetry: string
    registerLead: string
    registerLeadGithub: string
    loginLead: string
    loginLeadGithub: string
    loginLeadWechat: string
    loginLeadWechatGithub: string
    bindTitle: string
    bindLead: string
    comingSoon: string
    methodEmail: string
    methodPhone: string
    bindHint: string
    phoneSoon: string
    binding: string
    confirmBind: string
    methodClosed: string
  }
  password: {
    show: string
    hide: string
    met: string
    unmet: string
    required: string
    minLength: string
  }
  idle: {
    title: string
    body: string
    stay: string
  }
}

export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""))
}

const zh: Messages = {
  meta: {
    siteTitle: "凌风蝉 · cicadar",
    titleTemplate: "%s · 凌风蝉",
    siteDescription: "凌风蝉（cicadar）— 旅行攻略、博客与小工具，持续更新。",
  },
  nav: {
    language: "语言",
    chinese: "中文",
    cantonese: "粤语",
    english: "English",
    signIn: "登录",
    signUp: "注册",
    signOut: "退出",
  },
  home: {
    eyebrow: "旅行 · 记录 · 小工具",
    headline: "风起了，路还在长",
    lead: "旅行攻略已经上线；博客与小工具会陆续补上。",
    cta: "查看旅行攻略",
    navLabel: "站点入口",
    soon: "即将开放",
    guidesTitle: "旅行攻略",
    guidesDesc: "可执行的行程页，持续更新",
    guidesMark: "旅",
    blogTitle: "博客",
    blogDesc: "随笔与记录",
    blogMark: "文",
    toolsTitle: "小工具",
    toolsDesc: "日常好用的小能力",
    toolsMark: "具",
  },
  guides: {
    title: "旅行攻略",
    description: "凌风蝉 · 旅行攻略列表",
    introBefore: "由 travel-guide 生成的行程页。新攻略写入仓库 ",
    introAfter: " 后同步上线。",
    emptyTitle: "暂无攻略",
    emptyBefore: "添加 ",
    emptyAfter: " 后执行 ",
    emptyEnd: "。",
    back: "← 旅行攻略",
    open: "单独打开",
    notFound: "攻略未找到",
    fallbackDescription: "凌风蝉旅行攻略",
  },
  footer: {
    rights: "版权所有",
  },
  auth: {
    loginTitle: "登录",
    loginDescription: "继续你的旅行攻略、记录与小工具。",
    loginMeta: "登录凌风蝉（cicadar）账号。",
    registerTitle: "注册",
    registerDescription: "欢迎加入，从这里出发。",
    registerMeta: "注册凌风蝉（cicadar）账号。",
    loading: "加载中…",
    email: "邮箱",
    password: "密码",
    nickname: "昵称",
    signingIn: "登录中…",
    signIn: "登录",
    signingUp: "注册中…",
    signUp: "注册",
    or: "或",
    githubSignIn: "使用 GitHub 登录",
    githubSignUp: "使用 GitHub 注册/登录",
    noAccount: "还没有账号？",
    hasAccount: "已有账号？",
    signInFailed: "登录失败，请检查邮箱与密码",
    signUpFailed: "注册失败，请稍后重试",
    idleNotice: "因长时间无操作已自动退出，请重新登录。",
    wechat: "微信登录",
    wechatOpening: "正在打开小程序…",
    wechatHint: "请在小程序中完成授权，然后回到本页。",
    wechatExpired: "登录已超时，请重新点击微信登录",
    wechatRetry: "请重新点击微信登录",
    registerLead: "填写以下信息即可完成注册。",
    registerLeadGithub: "填写以下信息即可完成注册；也可在下方使用 GitHub。",
    loginLead: "使用邮箱密码登录凌风蝉",
    loginLeadGithub: "使用邮箱密码或 GitHub 登录凌风蝉",
    loginLeadWechat: "使用微信或邮箱密码登录凌风蝉",
    loginLeadWechatGithub: "使用微信、邮箱密码或 GitHub 登录凌风蝉",
    bindTitle: "完善账号",
    bindLead: "微信登录成功。请绑定登录方式后继续，后续将支持手机号。",
    comingSoon: "（即将支持）",
    methodEmail: "邮箱",
    methodPhone: "手机号",
    bindHint: "已有账号则验证密码并合并；没有账号则用该邮箱创建密码登录。",
    phoneSoon: "手机号绑定即将支持，请先使用邮箱。",
    binding: "绑定中…",
    confirmBind: "确认绑定",
    methodClosed: "该绑定方式暂未开放",
  },
  password: {
    show: "显示密码",
    hide: "隐藏密码",
    met: "已满足：",
    unmet: "未满足：",
    required: "要求：",
    minLength: "至少 {n} 位",
  },
  idle: {
    title: "即将因闲置退出登录",
    body: "约 {time} 后自动退出。继续操作可保持登录。",
    stay: "继续使用",
  },
}

const en: Messages = {
  meta: {
    siteTitle: "凌风蝉 · cicadar",
    titleTemplate: "%s · cicadar",
    siteDescription: "cicadar — travel guides, notes, and small tools, updated over time.",
  },
  nav: {
    language: "Language",
    chinese: "中文",
    cantonese: "Cantonese",
    english: "English",
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
  },
  home: {
    eyebrow: "Travel · notes · tools",
    headline: "The wind is up, and the road goes on",
    lead: "Travel guides are live. Notes and tools will follow.",
    cta: "Browse travel guides",
    navLabel: "Site sections",
    soon: "Coming soon",
    guidesTitle: "Travel guides",
    guidesDesc: "Ready-to-follow itineraries, updated over time",
    guidesMark: "G",
    blogTitle: "Notes",
    blogDesc: "Essays and records",
    blogMark: "N",
    toolsTitle: "Tools",
    toolsDesc: "Small things for everyday use",
    toolsMark: "T",
  },
  guides: {
    title: "Travel guides",
    description: "cicadar travel guides",
    introBefore: "Itinerary pages from travel-guide. New guides go live after they land in ",
    introAfter: ".",
    emptyTitle: "No guides yet",
    emptyBefore: "Add ",
    emptyAfter: ", then run ",
    emptyEnd: ".",
    back: "← Travel guides",
    open: "Open alone",
    notFound: "Guide not found",
    fallbackDescription: "A cicadar travel guide",
  },
  footer: {
    rights: "All rights reserved.",
  },
  auth: {
    loginTitle: "Sign in",
    loginDescription: "Pick up your guides, notes, and tools.",
    loginMeta: "Sign in to your cicadar account.",
    registerTitle: "Sign up",
    registerDescription: "Welcome. Start from here.",
    registerMeta: "Create a cicadar account.",
    loading: "Loading…",
    email: "Email",
    password: "Password",
    nickname: "Name",
    signingIn: "Signing in…",
    signIn: "Sign in",
    signingUp: "Creating account…",
    signUp: "Sign up",
    or: "or",
    githubSignIn: "Continue with GitHub",
    githubSignUp: "Continue with GitHub",
    noAccount: "New here?",
    hasAccount: "Already have an account?",
    signInFailed: "Could not sign in. Check the email and password.",
    signUpFailed: "Could not create the account. Try again in a moment.",
    idleNotice: "You were signed out after a stretch of inactivity. Sign in again.",
    wechat: "WeChat",
    wechatOpening: "Opening the mini program…",
    wechatHint: "Approve access in the mini program, then come back here.",
    wechatExpired: "That sign-in timed out. Try WeChat again.",
    wechatRetry: "Try WeChat again.",
    registerLead: "Fill in the form to create an account.",
    registerLeadGithub: "Fill in the form, or continue with GitHub below.",
    loginLead: "Sign in with email and password.",
    loginLeadGithub: "Sign in with email or GitHub.",
    loginLeadWechat: "Sign in with WeChat or email.",
    loginLeadWechatGithub: "Sign in with WeChat, email, or GitHub.",
    bindTitle: "Finish your account",
    bindLead: "WeChat sign-in worked. Link a sign-in method to continue. Phone numbers come later.",
    comingSoon: " (soon)",
    methodEmail: "Email",
    methodPhone: "Phone",
    bindHint:
      "If this email already has an account, we check the password and merge. Otherwise we create a password sign-in for it.",
    phoneSoon: "Phone linking is not ready yet. Use email for now.",
    binding: "Linking…",
    confirmBind: "Link account",
    methodClosed: "That option is not open yet.",
  },
  password: {
    show: "Show password",
    hide: "Hide password",
    met: "Met: ",
    unmet: "Not met: ",
    required: "Required: ",
    minLength: "At least {n} characters",
  },
  idle: {
    title: "About to sign out",
    body: "Signing out in about {time}. Stay active to keep the session.",
    stay: "Stay signed in",
  },
}

const yue: Messages = {
  meta: {
    siteTitle: "凌风蝉 · cicadar",
    titleTemplate: "%s · 凌风蝉",
    siteDescription: "凌风蝉（cicadar）— 旅行攻略、博客同小工具，持续更新。",
  },
  nav: {
    language: "语言",
    chinese: "中文",
    cantonese: "粤语",
    english: "English",
    signIn: "登入",
    signUp: "注册",
    signOut: "登出",
  },
  home: {
    eyebrow: "旅行 · 记录 · 小工具",
    headline: "风起咗，路仲长",
    lead: "旅行攻略已经上线；博客同小工具会陆续补上。",
    cta: "睇旅行攻略",
    navLabel: "网站入口",
    soon: "就快开放",
    guidesTitle: "旅行攻略",
    guidesDesc: "照住行嘅行程页，持续更新",
    guidesMark: "旅",
    blogTitle: "博客",
    blogDesc: "随笔同记录",
    blogMark: "文",
    toolsTitle: "小工具",
    toolsDesc: "日常好用嘅小功能",
    toolsMark: "具",
  },
  guides: {
    title: "旅行攻略",
    description: "凌风蝉 · 旅行攻略列表",
    introBefore: "由 travel-guide 生成嘅行程页。新攻略写进仓库 ",
    introAfter: " 之后就会同步上线。",
    emptyTitle: "暂时未有攻略",
    emptyBefore: "添加 ",
    emptyAfter: " 之后执行 ",
    emptyEnd: "。",
    back: "← 旅行攻略",
    open: "单独打开",
    notFound: "搵唔到攻略",
    fallbackDescription: "凌风蝉旅行攻略",
  },
  footer: {
    rights: "版权所有",
  },
  auth: {
    loginTitle: "登入",
    loginDescription: "继续你嘅旅行攻略、记录同小工具。",
    loginMeta: "登入凌风蝉（cicadar）账号。",
    registerTitle: "注册",
    registerDescription: "欢迎加入，由呢度出发。",
    registerMeta: "注册凌风蝉（cicadar）账号。",
    loading: "载入紧…",
    email: "邮箱",
    password: "密码",
    nickname: "昵称",
    signingIn: "登入紧…",
    signIn: "登入",
    signingUp: "注册紧…",
    signUp: "注册",
    or: "或者",
    githubSignIn: "用 GitHub 登入",
    githubSignUp: "用 GitHub 注册／登入",
    noAccount: "未有账号？",
    hasAccount: "已经有账号？",
    signInFailed: "登入失败，请检查邮箱同密码",
    signUpFailed: "注册失败，请阵间再试",
    idleNotice: "因为好耐冇操作，已经自动登出，请重新登入。",
    wechat: "微信登入",
    wechatOpening: "打开紧小程序…",
    wechatHint: "请喺小程序度完成授权，然后返嚟呢页。",
    wechatExpired: "登入超时咗，请再撳微信登入",
    wechatRetry: "请再撳微信登入",
    registerLead: "填好以下资料就可以完成注册。",
    registerLeadGithub: "填好以下资料就可以完成注册；亦可以喺下面用 GitHub。",
    loginLead: "用邮箱密码登入凌风蝉",
    loginLeadGithub: "用邮箱密码或者 GitHub 登入凌风蝉",
    loginLeadWechat: "用微信或者邮箱密码登入凌风蝉",
    loginLeadWechatGithub: "用微信、邮箱密码或者 GitHub 登入凌风蝉",
    bindTitle: "完善账号",
    bindLead: "微信登入成功。请绑定登入方式再继续，之后会支持手机号。",
    comingSoon: "（就快支持）",
    methodEmail: "邮箱",
    methodPhone: "手机号",
    bindHint: "如果呢个邮箱已经有账号，就验密码再合并；未有账号就用呢个邮箱开密码登入。",
    phoneSoon: "手机号绑定就快支持，请先用邮箱。",
    binding: "绑定紧…",
    confirmBind: "确认绑定",
    methodClosed: "呢种绑定方式暂时未开放",
  },
  password: {
    show: "显示密码",
    hide: "隐藏密码",
    met: "已经符合：",
    unmet: "未符合：",
    required: "要求：",
    minLength: "最少 {n} 个字",
  },
  idle: {
    title: "就快因为闲置登出",
    body: "大约 {time} 之后自动登出。继续操作就可以保持登入。",
    stay: "继续用",
  },
}

export const messages: Record<Locale, Messages> = { zh, yue, en }
