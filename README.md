# Credit Card Generator：新项目交接包

将整个 `credit-card-generator-handoff` 文件夹复制到新建的网站项目根目录即可。

## 文件顺序

1. 先读 `RESEARCH_SUMMARY.md`：为什么保留这个方向、已知限制和对标结论。
2. 再读 `MVP_REQUIREMENTS.md`：当前已讨论并收窄的第一版范围。
3. 用 `PRODUCT_BUILD_WORKFLOW.md` 推进；以后询问“下一步是什么”时，按其中的当前状态和完成条件回答。
4. 进入 SEO 后使用 `SEO_EXECUTION_RUNBOOK.md`；它是 SEO walkthrough、任务分工、验收清单和当前停止点的唯一主流程。

## 当前停止点

我们已经完成了：需求信号初筛、支付能力边界澄清、BetterBugs/TestMu/VCC Generator 对标、MVP 需求文档、核心页面实现、GitHub/Cloudflare 自动部署、正式域名绑定和桌面/手机验收。

GitHub 仓库：<https://github.com/christophershenk/credit-card-generator>。正式网站：<https://creditcardgenerator.online/>。

当前停止点：按 `SEO_EXECUTION_RUNBOOK.md` 完成页面与技术 SEO 基础包；之后接入 GSC，再接 GA。广告、登录和付费尚未开始。

## 一句话产品定义

一个免费、无需登录的英文 `Credit Card Generator` 页面：选择 7 种主流卡组织之一和数量（1–20），生成带 CVV、有效期和可复制卡号的合成测试卡；批量结果可复制 JSON 或下载 CSV。

## 本地查看

直接用浏览器打开 `index.html` 即可使用。它没有安装依赖、账号、服务端或环境变量。

## 本地验收

运行 `node qa-validate.mjs` 可复核七种卡组织、Luhn、CVV、有效期、1–20 张批量生成、错误输入、卡号复制、JSON 复制和 CSV 序列化。
