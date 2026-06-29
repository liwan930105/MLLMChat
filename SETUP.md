# 项目设置指南

## 1. 安装依赖

```bash
npm install
```

## 2. 配置环境变量

```bash
cp env.example .env.local
```

填写以下变量：
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`（可选）
- `DEEPSEEK_TEXT_MODEL`（可选）
- `DOUBAO_API_KEY`
- `DOUBAO_BASE_URL`（可选）
- `DOUBAO_IMAGE_MODEL`（可选）
- `DOUBAO_VIDEO_MODEL`（可选）

## 3. 启动开发环境

```bash
npm run dev
```

访问 `http://localhost:3000`。

## 4. 运行测试与构建

```bash
npm run test
npm run test:coverage
npm run build
```
