# 阿鑫烧烤 - 点单记账系统

## 项目概述
为朋友的小型烧烤店（10桌以内）开发的点单和记账工具。老板用手机操作，移动端优先。

## 技术栈
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL) 云端数据库
- Serwist (PWA / Service Worker)
- 部署在 Vercel，自动部署

## 关键架构
- 数据层采用"本地缓存 + 后台同步"模式：读数据从 localStorage（瞬间响应），写数据同时存本地 + Supabase（后台静默同步）
- 启动时调用 `initialSync()` 从云端拉取最新数据到本地
- 所有主键使用客户端生成的 UUID

## 代码修改后的部署流程
改完代码后必须执行以下步骤：
```bash
npm run build                # 构建验证
git add <changed files>      # 暂存改动的文件
git commit -m "描述"          # 提交
git push                     # 推送到 GitHub
```
推送后 Vercel 会自动部署（约30秒），用户刷新页面即为最新版。

## 数据库操作
本地网络有代理，psql 直连不通。通过 Supabase Management API 操作：
```bash
RAW_TOKEN=$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null)
TOKEN=$(echo "$RAW_TOKEN" | sed 's/^go-keyring-base64://' | base64 -d 2>/dev/null)
curl -s -X POST "https://api.supabase.com/v1/projects/jjleerzkadfgmqaihdfz/database/query" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q 'YOUR SQL HERE' '{query: $q}')"
```

## 环境变量
- `.env.local` 包含 Supabase URL 和 anon key（已在 Vercel 环境变量中配置）
- `.env.local` 不上传到 GitHub（在 .gitignore 中）

## 域名
- Vercel 默认：xin-bbq.vercel.app（国内被墙）
- 自定义域名：bbqxin.xyz（阿里云注册，DNS 指向 76.76.21.21）

## 用户信息
- 开发者（用户）是非技术人员，所有技术操作由 AI 完成
- 使用中文交流
- 系统使用者是烧烤店老板，用手机操作

## 数据库表
settings, dishes, orders, order_items, expenses, settlements, event_log

## 注意事项
- 弹窗如果内容多（如添加菜品），用全屏弹窗+顶栏按钮，避免底部按钮被导航栏遮挡
- 内容少的弹窗（如核销结算、确认删除）用居中弹窗即可
- 所有 store 函数是同步的（读 localStorage），写操作通过 bgSync 后台同步到 Supabase
