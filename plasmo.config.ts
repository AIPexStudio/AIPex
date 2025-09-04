// Plasmo 配置
// 注意：Plasmo 会自动处理多浏览器构建和 manifest 配置
// 大部分配置通过 package.json 中的 manifest 字段处理

export const config = {
  // 构建时环境变量处理
  // 这些环境变量可以通过 GitHub Secrets 在构建时注入
  env: {
    AI_HOST: process.env.AI_HOST || "https://api.openai.com/v1/chat/completions",
    AI_MODEL: process.env.AI_MODEL || "gpt-3.5-turbo",
    AI_TOKEN: process.env.AI_TOKEN || ""
  }
}
