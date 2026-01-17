> [!WARNING]
> 项目 v1 版本积极开发中，如需本地部署 v0 版本，请移步至 [backup/2026-01-16](https://github.com/iBUHub/TJUEcard/tree/backup/2026-01-16) 分支查看。

<h1 align="center">天津大学电费自动化查询工具</h1>
<p align="center">
  <a>让我们的系统自动查询您宿舍的电费，并在电费低于设定值时发送邮件提醒，旨在解决没及时充电费，导致突然停电的痛点。</a>
</p>

<p align="center">
  <a href="https://www.tju.edu.cn">
    <img
      src="https://img.shields.io/badge/天津大学-00478B?style=flat-square&logo=data:image/png;base64,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&labelColor=grey"
      alt="Chat" /></a>

  <a href="https://www.python.org/downloads/release/python-3127/">
    <img
      src="https://img.shields.io/badge/python%203.12-3776AB?style=flat-square&logo=data:image/svg+xml;charset=utf-8;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTcuOTA0NzIgMC4wMDAxMzA4N0M3LjI0NDk4IDAuMDAzMTYyOTUgNi42MTQ5MyAwLjA1ODgxNTMgNi4wNjA1NiAwLjE1NTg0QzQuNDI3NDQgMC40NDEyMDcgNC4xMzA5MyAxLjAzODUgNC4xMzA5MyAyLjE0MDAyVjMuNTk0NzlINy45OTAxOFY0LjA3OTcxSDQuMTMwOTNIMi42ODI1OUMxLjU2MDk4IDQuMDc5NzEgMC41Nzg4NzQgNC43NDY1IDAuMjcxNjgyIDYuMDE0OTVDLTAuMDgyNjU5NSA3LjQ2ODkgLTAuMDk4Mzc2NSA4LjM3NjE4IDAuMjcxNjgyIDkuODk0MzRDMC41NDYwMTEgMTEuMDI0NCAxLjIwMTE1IDExLjgyOTYgMi4zMjI3NSAxMS44Mjk2SDMuNjQ5NjVWMTAuMDg1NkMzLjY0OTY1IDguODI1NzQgNC43NTE3OCA3LjcxNDQxIDYuMDYwNTYgNy43MTQ0MUg5LjkxNTMxQzEwLjk4ODMgNy43MTQ0MSAxMS44NDQ5IDYuODQwNTYgMTEuODQ0OSA1Ljc3NDcyVjIuMTQwMDJDMTEuODQ0OSAxLjEwNTU2IDEwLjk2MjYgMC4zMjg0ODYgOS45MTUzMSAwLjE1NTg0QzkuMjUyMzUgMC4wNDY2ODcgOC41NjQ0NyAtMC4wMDI5MDEyMSA3LjkwNDcyIDAuMDAwMTMwODdaTTUuODE3NjcgMS4xNzAxN0M2LjIxNjMgMS4xNzAxNyA2LjU0MTg0IDEuNDk3NDIgNi41NDE4NCAxLjg5OTc4QzYuNTQxODQgMi4zMDA3MiA2LjIxNjMgMi42MjQ5NCA1LjgxNzY3IDIuNjI0OTRDNS40MTc2MSAyLjYyNDk0IDUuMDkzNSAyLjMwMDcyIDUuMDkzNSAxLjg5OTc4QzUuMDkzNSAxLjQ5NzQyIDUuNDE3NjEgMS4xNzAxNyA1LjgxNzY3IDEuMTcwMTdaIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXIpIi8+CjxwYXRoIGQ9Ik0xMi4zMjYyIDQuMDc5NzFWNS43NzQ3MkMxMi4zMjYyIDcuMDg4ODMgMTEuMTk5OCA4LjE5NDg4IDkuOTE1MyA4LjE5NDg4SDYuMDYwNTVDNS4wMDQ2NiA4LjE5NDg4IDQuMTMwOTIgOS4wODg3IDQuMTMwOTIgMTAuMTM0NlYxMy43NjkzQzQuMTMwOTIgMTQuODAzNyA1LjA0MDM4IDE1LjQxMjIgNi4wNjA1NSAxNS43MDlDNy4yODIxNyAxNi4wNjQyIDguNDUzNjQgMTYuMTI4NSA5LjkxNTMgMTUuNzA5QzEwLjg4NjkgMTUuNDMwNyAxMS44NDQ5IDE0Ljg3MDggMTEuODQ0OSAxMy43NjkzVjEyLjMxNDVINy45OTAxN1YxMS44Mjk2SDExLjg0NDlIMTMuNzc0NkMxNC44OTYyIDExLjgyOTYgMTUuMzE0MSAxMS4wNTU4IDE1LjcwNDIgOS44OTQzNEMxNi4xMDcxIDguNjk4NjUgMTYuMDkgNy41NDg4IDE1LjcwNDIgNi4wMTQ5NUMxNS40MjcgNC45MTA1OCAxNC44OTc2IDQuMDc5NzEgMTMuNzc0NiA0LjA3OTcxSDEyLjMyNjJaTTEwLjE1ODIgMTMuMjg0M0MxMC41NTgzIDEzLjI4NDMgMTAuODgyNCAxMy42MDg2IDEwLjg4MjQgMTQuMDA5NUMxMC44ODI0IDE0LjQxMTkgMTAuNTU4MyAxNC43MzkxIDEwLjE1ODIgMTQuNzM5MUM5Ljc1OTU1IDE0LjczOTEgOS40MzQwMiAxNC40MTE5IDkuNDM0MDIgMTQuMDA5NUM5LjQzNDAyIDEzLjYwODYgOS43NTk1NSAxMy4yODQzIDEwLjE1ODIgMTMuMjg0M1oiIGZpbGw9InVybCgjcGFpbnQxX2xpbmVhcikiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhciIgeDE9IjEuMjU5NjFlLTA4IiB5MT0iMS4wODIyM2UtMDgiIHgyPSI4LjgxNjY0IiB5Mj0iNy41OTU5NyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjNUE5RkQ0Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzMwNjk5OCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MV9saW5lYXIiIHgxPSIxMC4wNjU0IiB5MT0iMTMuODg3MiIgeDI9IjYuOTE5MTIiIHkyPSI5LjQyOTU3IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGRkQ0M0IiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkZFODczIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg==&labelColor=grey" /></a>

  <a href="https://deepwiki.com/iBUHub/TJUEcard">
    <img
      src="https://img.shields.io/badge/Ask%20DeepWiki-55B467?style=flat-square&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAAyCAYAAAAjrenXAAAACXBIWXMAAA7EAAAOxAGVKw4bAAACZUlEQVRoge2Yz0sbQRTH32yM4F1LrxsEBS9ejE0PXfEfKQiuCiL+McHg4sl/pKwIS0MvPfVSkh5b9aqCJjNeMjIZ3+zOz4TYfG+zM3nvM29nvjNZgLkmKxIiaOuoy8R20Wl6z+M14Oej7i0DWFb1+5yAt0BylVWiz/Tj94tP/1zzRa4BAPShAQCievTXR04v4NPQHHzSmlnwhbJOHT822Zg6ivPsNV4/SZWuh3a00h/rUKO/sD4R3hYaK4AILAF+6yXpLvJ8XL4riEkEVwHLkqs/1ggNLVdaF5qrRhY+/P6ydwtQscZtYACQAhD2tTjbvnTNNWSDGxgV2wm86GyhrlR0moTDh7hgAThXnChfdShgrpn18WDgcZ6xss1nujFlOW9OWTIQb4t2tnqdbQyHbnm8gcd5Nqjof52QLbQ4easDSOHHHKdmh1Wu0gNIlGICtOg034DZrlcRJs7PzwFIWjZGVKVl6fixDbgKCNsTmLx4rSl4FZSO3q+PR+0ei9q9YHdupO8hzrOHqhjKV4bBUgqbcNL4aQKiEmPk4M/OfobEeRw1lwAMNqdOdelxw+l6aqNSOzRdEuIEJg3vDZxLNYFxz86eAKBukkuO491V+klK5NeKtBdd83i/ZHFVeXU/SYnL8nq/Pm4dOID/j8V3+rECTHweCt55jeuA8TGYC+mLJmLL6gBylZ3/06SfHF7xFlqBqN0bgOIPAa0/r8DB2t1onNUkTfwfAHeo0lcng2EJbeBVS0aGN/7oaSofJ65xTtcA09IcfNL6z8EZOTUYfe8jpdcvqlXu4sNNuIJ8Ctbx/7lmTS9Deh+ig+4uuAAAAABJRU5ErkJggg==&labelColor=grey" /></a><br />

  <a href="https://github.com/iBUHub/TJUEcard/stargazers">
    <img
      src="https://img.shields.io/github/stars/iBUHub/TJUEcard?style=flat-square&logo=github&logoColor=FFCB47&color=FFCB47&labelColor=grey" /></a>

  <a href="https://github.com/iBUHub/TJUEcard/issues">
    <img
      src="https://img.shields.io/github/issues/iBUHub/TJUEcard?style=flat-square&logo=github&logoColor=E05D44&color=E05D44&labelColor=grey" /></a>

  <a href="https://github.com/iBUHub/TJUEcard/pulls">
    <img
      src="https://img.shields.io/github/issues-pr/iBUHub/TJUEcard?style=flat-square&logo=github&logoColor=5865F2&color=5865F2&labelColor=grey" /></a>

  <a href="https://github.com/iBUHub/TJUEcard/network/members">
    <img
      src="https://img.shields.io/github/forks/iBUHub/TJUEcard?style=flat-square&logo=github&logoColor=8AE8FF&color=8AE8FF&labelColor=grey" /></a>

  <a href="https://github.com/iBUHub/TJUEcard/graphs/contributors">
    <img
      src="https://img.shields.io/github/contributors/iBUHub/TJUEcard?style=flat-square&logo=github&logoColor=C4F042&color=C4F042&labelColor=grey" /></a>
</p>

<div align="justify">

## ⭐ 主要功能

🔍 自动化查询电费。

📩 当电费低于您设定的额度时，发送邮件来提醒您该充值电费了。

⏰ 自动设置定时任务，每天检查一次电费余额。

🔑 密码和邮箱授权码加密保存在本地，无需担心安全问题。

## 🚀 快速开始

1. **注册与登录**
   访问应用首页，点击注册按钮创建一个新账户。注册完成后，使用您的凭据登录系统。

2. **添加房间**
   登录后进入仪表盘，点击「添加房间」按钮。您需要提供房间的详细信息（如校区、楼栋、房间号）以便系统进行绑定。

3. **设置阈值**
   在房间列表中，您可以为每个房间设定一个电费报警阈值。当查询到的剩余电量低于该值时，系统将会向您注册的邮箱发送提醒通知。

## 🤝 贡献

我们欢迎任何形式的贡献！如果您有好的想法或需求，欢迎通过以下方式参与项目：

- **提交 Pull Request**：如果您修复了 bug 或实现了新功能，欢迎提交 PR。
- **创建 Issue**：如果您有任何建议或发现了问题，请在 [GitHub Issue](https://github.com/iBUHub/TJUEcard/issues) 页面进行讨论。
- **参与开发**：如果您对项目的开发感兴趣，欢迎通过邮件联系我们：[hello@ibuhub.com](mailto:hello@ibuhub.com)。

## ⚖️ 许可证

本项目之著作权归 iBUHub 所有。用户可以自由选择是否使用本项目。如果用户下载、安装、使用本项目，即表明用户信任该项目作者，作者提供开放源代码项目并根据许可证提供资助，其中包括为保护贡献者而明确规定「按原样」提供项目的条款，没有任何保证，并且对因使用项目而造成的损失不承担任何责任。

除非另有说明，本仓库的内容采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 许可协议。在遵守许可协议的前提下，您可以自由地分享、修改本仓库的内容。

如果您认为仓库的部分内容侵犯了您的合法权益，请联系项目维护者，我们会尽快删除相关内容。
