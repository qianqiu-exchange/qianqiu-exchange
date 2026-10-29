# 让Agent配置千秋交易所

本游戏可纯静态运行，未配置模型也能交易、串门与支援。用户授权后，Agent可以辅助完成自有API接入，无需TokenPay账号。

1. 检查用户明确授权使用的现有API服务或本机模型，不读取其他应用私有凭据，不将聊天订阅当成API额度。
2. 确认准确模型ID、完整Chat Completions地址与JSON文本回复能力。浏览器请求须获服务端CORS允许；不能靠网页脚本绕过。需要本地代理时，说明它运行在用户设备上，验证浏览器权限。
3. 生成或在连接页导入公开JSON配置，字段只允许：version、provider、endpoint、model、protocol、可选name与appUrl。示例结构见agent-setup.json，实际导入内容为其中profileSchema部分。不能把Key加入配置、URL查询参数、源码、日志或游戏存档。
4. 有页面操作能力时，打开「连接」页，选择「自有API / Agent配置」。字段ID依次是connection-provider、connection-endpoint、connection-model、connection-key。只在用户授权后将Key填入当前页面，不在回复中回显。自动化不得替用户勾选记住凭据。
5. 没有页面操作能力时，交付公开配置文件，让用户导入并在本机输入Key。必须诚实报告哪些步骤没有自动完成。
6. 「测试连接」会发起一次小额模型请求。说明这一点后在授权范围内执行；报告HTTP/协议/JSON结果，不声称配置成功就等于具备可用额度。游戏玩法模型调用还需由用户点击启用。

两套配置互相独立：TokenPay与direct不会静默互换或在失败时使用另一方余额。TokenPay此版本支持官方无回调S256 PKCE流程：前往授权页创建专用Key，将一次性Code复制回来交换；也支持已有Key手动直连。自动回跳未实现；真实登录、额度与合作后台归因仍需用户联调。公开协议见 https://tokendance.space/docs/api-key-oauth.md 。

用户可分别选择记住公开配置和在此浏览器记住Key。默认Key只在内存；本地记忆不是加密保险箱，同源脚本或浏览器环境仍可能读取。游戏JSON存档与公开连接配置均不包含Key。
