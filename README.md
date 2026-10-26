# Open Yuanbaotong

园宝通家长端的非官方 Web 客户端，面向已拥有园宝通账号的家长。保留 App 亲友圈、班级圈、图片拼图和黑底查看器的布局习惯，提供按需加载的图片预览与原图下载。

使用 React、Vite、Tailwind CSS 和 shadcn/ui，构建产物为纯静态资源，无自建后端、数据库或 Serverless Function。Vercel 使用 `vercel.json` 的外部 rewrite 转发官方 API，解决上游的浏览器跨域限制。

## 部署

在 Vercel 导入本仓库，Framework Preset 选择 **Vite**。仓库配置已指定：

- Build Command：`npm run build`
- Output Directory：`dist`
- Node.js：22 或更新版本

无需配置环境变量、API Key 或账号密码。手机号和验证码由使用者在部署后的页面输入。

## 本地开发

```sh
npm ci
npm run dev
npm run check
npm run build
```

本地预览地址为 `http://127.0.0.1:5173`。本地 Vite 服务器不转发 API；登录和动态接口需要在应用了 rewrite 的 Vercel 部署中使用。

## 使用与数据

- 使用已有账号的手机号获取验证码，登录后选择宝宝、亲友圈或班级圈。
- 动态默认展示最多四张图片；最后一张显示剩余数量。点图进入完整图片组。
- 查看器支持左右按钮、键盘方向键、触屏左右滑动、双击缩放和 Esc 关闭。
- 默认请求适合屏幕的图片预览。右上角菜单提供“查看原图”“下载原图”，底部也可直接下载原图。
- 登录凭据仅保存在当前标签页的 `sessionStorage`，退出时移除。验证码不持久保存。
- API 请求经过使用者部署的 Vercel 项目到达园宝通，代码不加入分析服务、请求日志或第三方数据收集。
- 只转发配置中明确列出的官方服务和媒体域名，不提供任意 URL 代理。API 响应要求不缓存。
- 图片下载保留原始文件内容，不经过截图、Canvas 或重新压缩。缩略图尺寸转换仅用于显示。
- 只读取账号本身可访问的数据，不提供发动态、评论、点赞等写入功能。

## 源码

| 文件 | 职责 |
| --- | --- |
| `src/api.js` | 官方接口调用、验证码登录与会话 |
| `src/models.js` | 上游数据结构适配 |
| `src/App.jsx` | 登录页、宝宝选择、动态列表 |
| `src/media.js` | CDN 预览参数与原图下载 |
| `src/Viewer.jsx` | 图片查看器交互 |
| `src/style.css` | App 风格与响应式适配 |
| `vercel.json` | 静态部署和外部 rewrite |

上游接口并非公开、稳定的开发者 API，可能改变字段或验证方式。登录后的账号数据与媒体行为需要使用本人账号验证；接口变化集中在 `api.js` 和 `models.js` 适配。

本项目与园宝通及其开发商无关联。shadcn/ui 组件源自其 MIT 许可项目。MIT 许可证仅适用于本仓库的代码；不包含官方安装包、图标素材、儿童照片或个人账号数据。
