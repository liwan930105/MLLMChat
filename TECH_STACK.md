---
description: "技术栈说明"
---

 # 技术栈
 - 前端框架 React+Next.js
 - 风格样式 Tailwind CSS
 - AI SDK Vercel AI SDK
 - 文本聊天模型 DeepSeek V4 Pro
 - 图片生成模型 doubao-seedream-4.0
 - 视频生成模型 豆包 Seeddance 1.5 Pro

  # 技术架构
  
	用户操作
		↓
	输入框+操作按钮 → useChat Hook → MultimodalChat组件
		↓
	请求：/api/ai-sdk/multimodal
		↓
	意图识别模块
	├─文本对话 → 文本聊天处理 → DeepSeek（文本）
	├─图片生成 → 图片生成处理 → 豆包 seedream（图生）
	└─视频生成 → 视频生成处理 → 豆包 Seedance（视频）
		↓（结果回流）
	useChat Hook 更新消息状态
		↓
	消息列表UI 展示对话/图片/视频