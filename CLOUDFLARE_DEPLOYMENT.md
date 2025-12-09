# Cloudflare Pages 部署指南

## 🔧 已修复的问题

### 最新修复：流式输出卡住/超时问题

修复了智谱 GLM 等模型在 Cloudflare 上流式输出卡住的问题：

1. **增加超时时间**：`maxDuration` 从 60 秒增加到 120 秒
2. **添加 SSE Headers**：添加 `Cache-Control: no-cache` 和 `X-Accel-Buffering: no` 禁用代理缓冲
3. **优化 API 请求**：
   - 增加 fetch 超时到 180 秒
   - 添加 `Accept: text/event-stream` header
   - 添加 `Connection: keep-alive` header
4. **新增 GLM 模型**：添加了 `glm-4.6`、`glm-4-0520`、`glm-4-long` 等模型选项

---

修复了 `ERR_SSL_PROTOCOL_ERROR` 和网络错误问题，通过以下配置更新：

### 1. Wrangler 配置更新 (`wrangler.jsonc`)
- ✅ 升级到 `nodejs_compat_v2`（更好的 Node.js API 支持）
- ✅ 添加 `streams_enable_constructors`（支持流式响应）
- ✅ 增加 CPU 时间限制到 30 秒（AI 生成需要更多时间）

### 2. Next.js 配置更新 (`next.config.ts`)
- ✅ 添加 `serverActions` 配置
- ✅ 设置 `bodySizeLimit` 为 10MB（支持大型 XML 数据）

## 📝 部署步骤

### 方法一：通过 Wrangler CLI 部署

1. **重新构建项目**
   ```bash
   npm run build:cf
   ```

2. **部署到 Cloudflare**
   ```bash
   npm run deploy
   ```

### 方法二：通过 Cloudflare Dashboard 部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** > **Pages**
3. 找到您的项目 `aidraw`
4. 点击 **Settings** > **Environment Variables**
5. 添加以下环境变量（如果使用自定义 API）：
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   等等...

6. 点击 **Settings** > **Functions**
7. 确保 **Compatibility Flags** 包含：
   - `nodejs_compat_v2`
   - `streams_enable_constructors`

8. 重新部署项目

## 🚨 重要提示

### 环境变量配置
由于您在前端使用动态 API 配置，确保：
- 用户在前端输入的 API Key 会被正确传递到后端
- 不需要在 Cloudflare 中设置环境变量（除非您想设置默认值）

### 兼容性日期
当前设置为 `2024-09-23`，这是一个稳定的版本。如果遇到问题，可以尝试更新到最新日期。

### CPU 时间限制
- 免费计划：最多 10ms
- 付费计划：最多 50ms
- 当前设置：30000ms（30秒）- 需要付费计划

如果您使用的是免费计划，请删除 `wrangler.jsonc` 中的 `limits` 部分。

## 🔍 故障排查

### 如果仍然出现网络错误：

1. **检查浏览器控制台**
   - 查看完整的错误堆栈
   - 确认 API 请求是否发送到正确的端点

2. **检查 Cloudflare 日志**
   ```bash
   npx wrangler tail
   ```

3. **验证 API Key**
   - 确保 API Key 格式正确
   - 测试 API Key 在本地是否工作

4. **检查 CORS 设置**
   - Cloudflare Workers 可能需要额外的 CORS 配置

### 如果出现超时错误：

- AI 生成可能需要较长时间
- 考虑增加超时设置或优化 prompt

## 📚 相关文档

- [OpenNext.js Cloudflare](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Compatibility](https://developers.cloudflare.com/workers/configuration/compatibility-dates/)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
