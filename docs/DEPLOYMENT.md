# 官网、网页和 Android 测试发布 0.3.2

用户明确授权将官网与网页版推送到 `qianqiu-exchange` GitHub 组织，并提供 Android APK。

预定发布地址：
- 官网：https://qianqiu-exchange.github.io/
- 网页游戏：https://qianqiu-exchange.github.io/qianqiu-exchange/
- 源码：https://github.com/qianqiu-exchange/qianqiu-exchange
- 安卓：https://github.com/qianqiu-exchange/qianqiu-exchange/releases/latest/download/qianqiu-exchange-android.apk

官网和游戏是两个独立公开仓库，使用 main 分支根目录发布 GitHub Pages。没有后端、官方模型代理、账号、遥测或玩家存档上传。官网源码沿用纸面、毛笔标题、文楷正文；使用游戏实际截图，无虚构战绩。

网页与 APK 使用同一规则和存档格式；APK 新增受限的系统 JSON 导出桥、系统文档导入、外部浏览器授权和 Android 屏幕边缘/键盘适配。原有规则与双 BYOK 保留。安卓签名材料和构建产物不进入 git 或网页目录。

## 已实际执行的检查

- Node 单元测试 65 项通过，见 publish-unit-results.txt。
- 游戏浏览器主流程 17 项通过，见 publish-browser-results.json。模型与 TokenPay 使用模拟接口，未做真实付费联调。
- 官网 360/390/430/1440 宽度无横向溢出；实际截图加载、安卓下载链接目标、进入游戏和脚本异常共4项检查通过，见 publish-site-results.json。
- Android SDK 实际编译、D8、APK v2/v3 签名与 zipalign 校验通过。

模拟器检查和公网发布结果完成后追加记录。无安卓真机连接，不能将模拟器检查称为用户手机验证。

## 体验验收与边界

官网首屏依次说明这是历史轻策略、怎样玩、进入网页和下载安卓两个明确选择；零 Key 玩法和模型额度分开说明。FAQ 明确本地存档不自动同步、卸载前备份及测试包安装方式。操作继续沿用 UI/UX 技能 W4/K4 的统一视觉和具体按钮语言，排版数值与此验证方式为综合方案 S。

后续真人任务：用手机从官网进入游戏并买粮支援；下载 APK 安装，导出网页进度再导入安卓，检查是否理解游戏币与模型额度。尚未执行此真人测试。
