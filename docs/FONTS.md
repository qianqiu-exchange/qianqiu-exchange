# 市井手记 · 字体说明

视觉参考：[IntentKit / 意译](https://vibe-design-labs.github.io/Vibe-UI-UX/)。使用相同来源的开源字体，游戏版式和组件重新设计，未复制参考站业务代码或品牌。

| 用途 | 来源 | 本地 Web 家族 |
| --- | --- | --- |
| 主标题、人物印记、段落标题 | [Ma Shan Zheng / 马善政毛笔楷书](https://github.com/google/fonts/tree/main/ofl/mashanzheng) | Qianqiu Brush |
| 正文、对白、表单、导航 | [LXGW WenKai / 霞鹜文楷](https://github.com/lxgw/LxgwWenKai) | Qianqiu Notes |
| 英文手写注记、页签序号 | [Caveat](https://github.com/google/fonts/tree/main/ofl/caveat) | Qianqiu Script |
| 价格、数量、资产估值 | 系统 Segoe UI / Arial | 无外部字体请求 |

三款字体均依 SIL Open Font License 1.1 分发，完整许可和版权声明保存在 `fonts/*-OFL.txt`；字体许可独立于游戏代码许可。根据游戏静态文本生成 WOFF2 子集并重命名家族。原始文件 SHA-256、字形数和实际大小见 `fonts/manifest.json`。

三款 WOFF2 合计 667,924 字节，约 652 KiB。标题和正文预加载，英文注记按需加载，无字体 CDN、账号或在线服务依赖。

子集覆盖当前界面和预设文本。玩家输入与模型回复中未覆盖的汉字回退到设备楷体或系统衬线字体，不能承诺所有动态文本始终使用相同字体。扩写大量静态内容时应更新子集；字体以 `font-display: swap` 加载，未加载完成时仍可操作。
