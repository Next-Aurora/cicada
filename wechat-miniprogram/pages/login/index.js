const { apiBaseUrl } = require("../../config")

Page({
  data: {
    ticket: "",
    loading: false,
    done: false,
    message: "",
  },

  onLoad(query) {
    const ticket = typeof query.ticket === "string" ? query.ticket.trim() : ""
    if (!ticket) {
      this.setData({ message: "缺少登录凭证，请从网页重新发起登录" })
      return
    }
    this.setData({ ticket })
    this.completeLogin()
  },

  completeLogin() {
    if (this.data.loading || this.data.done || !this.data.ticket) return

    this.setData({ loading: true, message: "" })

    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          this.setData({ loading: false, message: "无法获取微信登录码，请重试" })
          return
        }

        wx.request({
          url: `${apiBaseUrl}/api/auth/wechat-mini/complete`,
          method: "POST",
          header: {
            "content-type": "application/json",
          },
          data: {
            ticket: this.data.ticket,
            code: loginRes.code,
          },
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              this.setData({ loading: false, done: true, message: "" })
              return
            }

            const message =
              res.data && typeof res.data.message === "string"
                ? res.data.message
                : "登录失败，请返回网页重试"
            this.setData({ loading: false, message })
          },
          fail: () => {
            this.setData({
              loading: false,
              message: "网络请求失败，请检查小程序服务器域名配置",
            })
          },
        })
      },
      fail: () => {
        this.setData({ loading: false, message: "微信登录失败，请重试" })
      },
    })
  },
})
