# Android 离线测试版 0.3.2

包名 `cn.qianqiu.exchange`，Android 8.0+，目标 Android 15 / API 35，无原生 CPU 库，适用 ARM64、ARM32、x86_64 等系统。

游戏、字体和预设内容在 APK 内，离线可完整运行。WebView 使用私有 HTTPS 资源源 `https://appassets.androidplatform.net/assets/www/`，仅映射包内白名单路径；不会从官网远程拉游戏页面。联网只在主动调用自己的模型或打开外部链接时发生。

两套 BYOK 和网页共用逻辑；TokenPay 授权在外部浏览器打开，将 Code 复制回来。应用归因为 `app://qianqiu-exchange-android`。模型接口须允许 HTTPS 和 WebView 来源的 CORS，本包不绕过证书或跨域检查。

进度保存在应用数据中，与浏览器不自动同步。导出走 Android 系统“保存到”，导入走系统文档选择器；无需读写存储权限。导出不含 Key。卸载或清除数据前请备份。应用禁止系统自动备份，避免可选记住的模型 Key 进入云备份。

## 构建

需要 Python 3.9+、JDK 17+、Android SDK Platform 35 和 Build Tools 35.0.1，无 Gradle/npm 依赖：

```powershell
python android/build-apk.py --sdk D:\Android\sdk
```

在其他系统需将脚本的 Windows 工具扩展名改为对应平台名称。输出 `android/build/release/qianqiu-exchange-android.apk`，并产生版本、哈希、包内资源清单。脚本执行资源编译、Java 编译、D8、zipalign、测试证书签名、签名及对齐校验。

首次构建在 `android/keys/qianqiu-test.jks` 生成本地测试证书，目录已被 git 忽略，不会进入 APK、网页或源码发布包。它是测试签名，不是应用商店发布证书。保留本地证书可给测试机覆盖升级；独立重建者应使用自己的证书。

`--qa` 生成单独的可调试 APK，供模拟器通过 WebView CDP 验证。公开下载 APK 的 manifest 设置 `debuggable=false`；正常版不开放 WebView 调试。两者包名相同，只在隔离模拟器替换安装。

## 原生边界

- 只申请 INTERNET，无定位、相机、联系人或存储权限。
- 远程导航交给外部浏览器，包内界面不加载远程页面或脚本。
- 原生桥仅提供用户主动选择位置的 JSON 导出；有大小限制，不提供任意路径读写或模型代理。
- 保留 SSL 默认校验、禁止混合内容与明文 HTTP；不运行模型返回代码。
- JavaScript 运行能力由系统 Android System WebView 提供；过旧时应更新此组件。

设备实际测试情况见 `../docs/DEPLOYMENT.md`，不要将签名校验当作真机验证。
