---
description: "项目结构规范"
---

mllm-chat/
├── pages/                    # Next.js 页面和 API 路由
│   ├── _app.tsx             # 应用入口，全局样式引入
│   ├── index.tsx             # 前端首页
│   └── api/                  # API 路由目录
│
├── lib/                      # 工具库和配置
│
├── types/                    # TypeScript 类型定义
│
├── styles/                   # 全局样式
│   └── globals.css          # Tailwind CSS 和自定义样式
│
├── node_modules/            # 依赖包（自动生成）
│
├── .next/                    # Next.js 构建输出（自动生成，已忽略）
│
├── package.json             # 项目配置和依赖
├── package-lock.json        # 依赖锁定文件
├── tsconfig.json            # TypeScript 配置
├── next.config.js           # Next.js 配置
├── tailwind.config.cjs      # Tailwind CSS 配置
├── postcss.config.cjs       # PostCSS 配置
│
├── env.example              # 环境变量示例文件
│
├── API_DOCUMENTATION.md     # API 接口文档
├── SETUP.md                 # 项目设置指南
├── PROJECT_STRUCTURE.md     # 本文件：项目结构文档
├── CODE_STYLE.md     # 项目代码风格规范
├── FUNCTION_STYLE.md     # 功能实现规范
│
└── test-*.sh                 # 测试脚本