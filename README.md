# Credit Card Generator：新项目交接包

将整个 `credit-card-generator-handoff` 文件夹复制到新建的网站项目根目录即可。

## 文件顺序

1. 先读 `RESEARCH_SUMMARY.md`：为什么保留这个方向、已知限制和对标结论。
2. 再读 `MVP_REQUIREMENTS.md`：当前已讨论并收窄的第一版范围。
3. 用 `PRODUCT_BUILD_WORKFLOW.md` 推进；以后询问“下一步是什么”时，按其中的当前状态和完成条件回答。

## 当前停止点

我们已经完成了：需求信号初筛、支付能力边界澄清、BetterBugs/TestMu/VCC Generator 对标、MVP 需求文档和核心页面实现。

GitHub 身份认证、公开仓库创建和首次推送已完成：<https://github.com/christophershenk/credit-card-generator>。

尚未开始：完整本地验收、预览部署、域名、广告、登录或付费。

## 一句话产品定义

一个免费、无需登录的英文 `Credit Card Generator` 页面：选择 7 种主流卡组织之一和数量（1–20），生成带 CVV、有效期和可复制卡号的合成测试卡；批量结果可复制 JSON 或下载 CSV。

## 本地查看

直接用浏览器打开 `index.html` 即可使用。它没有安装依赖、账号、服务端或环境变量。

## 本地验收

运行 `node qa-validate.mjs` 可复核七种卡组织、Luhn、CVV、有效期、1–20 张批量生成、错误输入、卡号复制、JSON 复制和 CSV 序列化。
