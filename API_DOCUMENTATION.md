# API 文档

## `POST /api/ai-sdk/multimodal`

统一多模态聊天接口，支持：
- 文本对话（DeepSeek V4 Pro）
- 图片生成（doubao-seedream-4.0）
- 视频生成（Seedance 1.5 Pro）

### 请求体

```json
{
  "id": "chat-id-optional",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "请生成一张赛博朋克城市夜景" }]
    }
  ],
  "intentHint": "image"
}
```

字段说明：
- `messages`：AI SDK UI Message 历史消息数组（必填）
- `intentHint`：可选，`text | image | video`。不传时将根据最后一条用户文本自动识别意图。

### 响应

接口返回 AI SDK UI Message Stream（SSE），包含以下数据片段：
- `data-intent`：意图识别结果
- `data-status`：状态更新（transient）
- `data-media`：图片或视频生成结果（包含 `kind / url / prompt / model`）
- `text`：助手文本回复

### 错误码

- `400`：请求参数不合法
- `405`：请求方法不支持
- `500`：模型调用失败或上游服务不可用
