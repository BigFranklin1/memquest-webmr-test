# MemQuest 历史学习与 WebXR 原型

MemQuest 是一个面向手机浏览器的历史学习原型，使用 React、Vite、Three.js、WebXR 和本地 OCR 实现。它将摄像头文字扫描、历史事件时间线、人物互动、可探索的 3D 场景，以及全局挑战与学习进度整合在一个网站中。

当前完整开发的历史单元是 **American Revolution（美国革命）**。应用界面与语音保持英文，本文档使用中文。

- 生产站点：[打开 MemQuest](https://webxr-test-one.vercel.app/)
- 本地预览：[http://localhost:4173/](http://localhost:4173/)
- 设计与验证记录：[design-qa.md](./design-qa.md)
- 零基础交接与作品集指南：[MemQuest 新手交接指南](./docs/HANDOFF.zh-CN.md)（含 Git、环境、Codex、功能地图、截图、部署与作品集模板）

> 首次接手建议先阅读交接指南的第 1–5 节。正式交付前需核对本地、GitHub 与 Vercel 版本；保存代码不等于已推送或已上线。

## 一、快速运行

### 环境要求

- 推荐 Node.js 24.x，与当前已验证的本地和 Vercel 主版本一致。
- Windows PowerShell 5.1 或更高版本，可使用项目内的 PowerShell 启动器。
- Scan 需要带摄像头的浏览器。
- 手机上的摄像头、设备方向与 WebXR 能力需要在支持相关功能的浏览器和安全上下文中使用；真机测试请使用 HTTPS 地址。

### Windows PowerShell

进入项目目录后运行：

```powershell
cd E:\code\webxr-test

# 首次使用或依赖缺失时安装；已有 node_modules 时可以跳过
.\scripts\project.ps1 install

# 启动开发服务器
.\scripts\project.ps1 dev
```

看到 Vite 的 ready 提示后，打开 [http://localhost:4173/](http://localhost:4173/)。保持终端运行；需要停止服务器时按 `Ctrl+C`。

启动器直接使用 Node 和项目内的 Vite，绕过全局 `npm/pnpm/pnpx` 命令入口。`install` 会直接调用 Node 安装目录下的 npm CLI，并使用 `--package-lock=false`，不会覆盖项目现有的 `pnpm-lock.yaml`。它不会安装全局工具或修改系统目录。

> 不需要执行 `corepack enable`，也不需要用管理员权限启动这个项目。

### 已有正常 pnpm 环境的其他平台

项目保留了 `pnpm-lock.yaml`。若系统中的 pnpm 已正常安装，也可以使用：

```bash
pnpm install --frozen-lockfile
pnpm dev --host 0.0.0.0 --port 4173 --strictPort
```

本地 npm 兼容安装与 pnpm 锁文件安装不是完全相同的依赖解析方式；需要严格复现锁定依赖时使用后者。

## 二、常用命令

以下命令均在项目根目录执行：

| 操作 | PowerShell 命令 |
| --- | --- |
| 安装依赖 | `.\scripts\project.ps1 install` |
| 启动开发服务器 | `.\scripts\project.ps1 dev` |
| 应用单元测试 | `.\scripts\project.ps1 test` |
| 生产构建 | `.\scripts\project.ps1 build` |
| 静态托管与路由测试 | `.\scripts\project.ps1 test:sites` |
| 预览生产构建 | `.\scripts\project.ps1 preview` |

开发服务器和生产预览都使用 4173 端口，不要同时启动。使用 `preview` 前先执行 `build`。

### PowerShell 常见问题

**报错：`EPERM: operation not permitted, open 'C:\Program Files\nodejs\pnpx'`**

这通常发生在 Corepack 尝试向受保护的 Node 安装目录创建命令入口时，不是应用代码错误。跳过 `corepack enable`，改用上面的项目启动器。

**直接运行 npm 提示找不到或无法访问 `npm-cli.js`**

可能是全局 npm 入口选择了异常的用户级安装。项目启动器不经过这个入口。如果启动器的 `install` 也无法找到系统 npm CLI，需要修复 Node.js 安装；已有依赖时仍可以直接运行 `dev`、`test` 和 `build`。

**系统提示禁止运行 PowerShell 脚本**

若只是本机执行策略限制，可以仅对本次进程运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\project.ps1 dev
```

这条命令不会永久修改系统执行策略。受组织策略管理的电脑请遵循组织要求。

**提示 4173 端口已被占用**

先打开已有的本地预览；如果需要重启，回到之前启动项目的终端按 `Ctrl+C`，再运行启动命令。不要随意结束不明进程。

## 三、信息层级与功能

四个底部导航是全局入口：

```text
MemQuest
├── Scan：扫描英文文字 → 历史事件 → 时间线 / 人物互动
├── Library：时代目录 → 美国革命单元
│   ├── Explore：概览 → Boston Harbor 1773 场景
│   ├── Timeline：事件与因果关系
│   ├── People：人物档案与关系
│   ├── Evidence：历史线索与证据分析
│   └── Memory Check：单元练习
├── Challenges：跨单元任务目录与挑战
└── Progress：跨单元学习记录与反馈
```

Challenges 和 Progress 不属于美国革命单元。美国革命只是第一份已发布内容；Ancient China、Silk Road Civilizations 和 World War II 目前标记为 Coming soon，不计入学习总数。

### Scan：本地英文 OCR

- Android 和 iPhone 均使用 `getUserMedia` 打开后置摄像头，便于读取视频帧。
- 扫描时全屏显示相机，暂时隐藏品牌栏、底部导航和大面积说明卡，仅保留退出按钮、透明取景框和边缘状态条。成功或失败后再弹出结果界面；重新扫描会再次收起界面。
- 只对透明取景框内可见的文字取样，按视频 `object-fit: cover` 映射回相机原始像素，适配手机横竖屏，避免识别屏幕之外的内容。图像稳定后运行浏览器端 Tesseract.js 7 OCR。
- 英文模型、Worker 和 WASM 随站点部署，扫描时才加载，不调用第三方 OCR 服务。
- 当前只匹配四个预设事件：

| 英文事件 | 中文说明 | 年份 |
| --- | --- | --- |
| Stamp Act | 印花税法 | 1765 |
| Boston Massacre | 波士顿惨案 | 1770 |
| Boston Tea Party | 波士顿倾茶事件 | 1773 |
| First Continental Congress | 第一届大陆会议 | 1774 |

匹配允许少量 OCR 错字，但必须命中标题或事件专属短语，仅有年份不能触发匹配。三轮未匹配时显示明确的无匹配状态；OCR 加载或执行失败时显示单独的错误与重试入口。

识别成功后会继续保留实时摄像头，并在透明 Three.js 场景中生成带短暂粒子揭示效果的 Samuel Adams 人物模型。周围悬浮事件资料、故事语音、时间线、Samuel Adams 人物页和再次扫描入口。默认仍使用稳定的屏幕空间投影，不改变原有流程。只有匹配 Boston Tea Party 时才可手动打开 `Page anchor` 测试开关：它会按需加载本地图片追踪模块，并以 `src/assets/tracking/boston-tea-party-cover.png` 为参考目标，让人物的位置和朝向跟随封面；封面离开画面时模型暂时隐藏，其他操作仍可使用。该能力是当前页面会话中的图片目标姿态，不是平面检测、持久空间锚点或 WebXR Anchors。摄像头画面和识别文本不会上传、持久化或计入学习进度。

### 人物互动与语音

- Samuel Adams 人物档案显示与本次识别事件的关联，而不是声称识别了人物面孔。
- 提供三个预设问题，点击后播放英文回答。
- 人物介绍、问答、事件和港口线索均使用预先生成并随站点提供的 HeyGen WAV 音频。
- 人物语音采用成熟、严肃的 Norman 声线；当前不是实时生成对话。
- 不录制麦克风，也不使用浏览器语音合成。

### Library：美国革命学习单元

- **Explore**：查看时代概览，进入 Boston Harbor 1773。
- **Timeline**：四张图文事件卡片与因果联系；手机端支持水平滑动和吸附切换。
- **People**：人物肖像、简介、角色、关键事件、盟友与对手关系；人物肖像标注为历史形象解读。
- **Evidence**：按物件、记录、法律和报道等来源理解证据，区分其支持的结论与不能证明的内容。未发现的场景线索保持锁定。
- **Memory Check**：五道涵盖时间顺序、人物视角、证据和因果的练习题，包含反馈、关联复习入口与重试。

各部分共享学习记录，跨链接会保留选中的事件、人物或证据。

### Boston Harbor：可交互 3D 场景

场景由 Three.js 程序化生成，包括六面体夜空天空盒、分层动态低雾、动态水面、木质甲板、货物、船只，以及错落排列的山墙仓库。仓库采用完整山墙几何，烟囱按屋顶坡面定位，不再穿过三角立面。四个线索物件分别是：

1. 遮光提灯；
2. 东印度公司茶箱；
3. Dartmouth 茶船；
4. 船木匠的手斧。

点击物件后，在物件附近显示小卡片，提供 `Listen to the story` 与可展开的 `Why it matters`。切换或关闭线索、离开场景时会停止音频。半透明交互提示配合更宽容的点击范围；拖动视角不会触发物件点击。

支持设备可以进入 `immersive-vr`；普通手机使用设备方向控制视角，所有设备均保留拖动查看的回退方式。部分手机需在用户点击后授权设备方向访问。

### Challenges：全局挑战

当前提供四类可完成的挑战：

- **港口调查**：实际发现四个物件，并分别展开其历史意义。仅进入场景不算完成。
- **历史事件排序**：调整四个事件的先后顺序，提交后查看结果。
- **人物与视角**：根据人物身份、立场与关系完成选择题。
- **证据推理**：判断来源支持什么、有什么限制，以及事件之间的因果关系。

任务支持按时代、能力和完成状态筛选，优先推荐未完成任务或适合继续练习的内容。跳到 Library 查看相关资料后，可通过返回栏回到原挑战，保留答案与排序。

### Progress：全局学习记录

- 已探索和已完成的单元；
- 已完成挑战与待复习问题；
- 单元探索记录、最新 Memory Check 成绩和分类明细；
- 时间顺序、因果、人物视角、证据推理四类练习反馈；
- 已获得里程碑和可点击的近期活动。

**统计原则：**

- 探索只记录实际查看或发现的内容，不等同于掌握知识。
- 练习反馈只使用提交的作答，不因浏览页面而提高。
- 最近 100 次练习中，每道不同题目仅使用其最新一次答案；事件排序整体算一道题。
- 至少有三道不同题目的结果才显示该能力的正确率；样本不足时明确提示。
- 美国革命的全部 18 条内容记录完成，且 Memory Check 达到至少 80%，才获得单元完成标记。已获得的完成标记不会因后续较低成绩被撤销。
- 同一挑战重试不重复增加完成数；锁定证据不计为已查看。
- 不展示“已学会全部历史的百分比”，也不将练习正确率称为整体掌握程度。

## 四、本地存档与隐私

当前没有账号、数据库、云同步或排行榜，所有学习记录仅保存在当前浏览器与站点来源下。

- 新版存档键：`memquest.learning.v1`。
- 内容包括单元状态、挑战草稿、最多 100 次练习和 80 条近期活动。
- 新用户没有预填的发现记录。
- 旧存档 `memquest.american-revolution.v2` 不会被删除或覆盖。
- 在 Progress 中展开 `Earlier prototype progress is available to review`，可检查并主动导入旧探索记录。旧原型可能包含演示预填数据，导入前会提示；旧成绩不会进入新版能力反馈。
- 浏览器禁止存储时，降级为当前会话并在界面提示。
- 刷新后保留挑战草稿，但不会自动重开摄像头或 VR。
- 本地地址和生产域名的存档相互独立；清除网站数据、更换浏览器或设备不会自动迁移记录。
- 摄像头帧、OCR 文本与麦克风数据不进入存档。

## 五、技术结构

| 部分 | 技术 |
| --- | --- |
| 界面 | React 19、Vite 6、Phosphor Icons |
| 3D 场景 | Three.js、WebXR |
| 文字识别 | Tesseract.js 7、随站点部署的英文模型与 WASM |
| 语音 | 本地托管的 HeyGen 预生成英文音频 |
| 状态与存档 | React reducer、版本化 localStorage |
| 发布 | Vercel 静态站点；保留 Sites 构建兼容层 |

原型运行不需要业务后端或必填 API 密钥。生成媒体所用的外部服务凭据不得写入前端代码或上传到站点。

```text
src/
├── App.jsx                  # 应用外壳、全局导航、相机/XR 占用管理
├── experience.js            # getUserMedia 与 immersive-ar 控制器
├── ScanExperience.jsx       # Scan、识别结果、人物、问答与时间线
├── ScanArtifactProjection.jsx # 默认屏幕空间人物与粒子投影
├── SamuelAdamsProjectionModel.js # 共用 FBX 加载、尺寸归一化、循环动画与资源释放
├── ScanImageAnchorProjection.jsx # 可选封面图片追踪与页面锚定投影
├── assets/tracking/           # 参考封面原图与编译后的 .mind 目标
├── scanData.js              # 人物、事件和 OCR 匹配预设
├── scanMatcher.js           # 文本归一化与模糊匹配
├── scanState.js             # Scan 状态机
├── ocrRuntime.js            # 按需创建 OCR Worker
├── ocrScanner.js            # 稳定帧检测、串行 OCR 与资源释放
├── LibraryExperience.jsx    # Library 入口与单元导航
├── RevolutionUnit.jsx       # Timeline、People、Evidence、Memory Check
├── HarborScene.jsx          # 程序化港口场景与物件交互
├── libraryState.js          # 美国革命单元状态与记录恢复
├── learningData.js          # 全局目录、能力分类、挑战定义
├── learningState.js         # 全局记录、草稿、成绩与活动
├── GlobalWorkspace.jsx      # Challenges 与 Progress 页面
├── global.css               # 全局页面响应式样式
└── styles.css               # 共享视觉样式与安全区适配

scripts/
├── project.ps1              # Windows 项目命令入口
├── compile-image-target.mjs # 从参考 PNG 重新生成 MindAR 目标
└── prepare-sites-build.mjs  # Sites 构建兼容层

tests/
├── experience.test.mjs      # 相机与 WebXR 控制器
├── scan.test.mjs            # 事件匹配与 Scan 状态
├── ocrScanner.test.mjs      # 稳定帧、串行识别、取消与释放
├── library.test.mjs         # 单元、线索、档案关系与练习
├── learning.test.mjs        # 全局统计、存档、挑战与上下文
├── sites-worker.test.mjs    # 静态资源与 SPA 路由回退
├── global-browser-fixture.html # 使用独立内存存档的应用测试页
├── harbor-browser-fixture.html # 独立的真实 3D 港口视觉测试页
└── ocr-browser-fixture.html # 本地 OCR 集成测试页
```

## 六、Scan 实现流程

1. 进入 Scan 时结束已有 immersive AR，会以 `preferWebXR: false` 请求普通后置摄像头。
2. 每 450 ms 采样当前可见取景框的低分辨率灰度图；旋转手机后重新计算取样范围。
3. 连续稳定帧触发识别；8 秒仍未稳定时放宽限制完成一次尝试。
4. 对截取区域进行灰度预处理和缩放，再交给 OCR。
5. 一个扫描周期复用一个 Worker，任务不并发。
6. 匹配成功即显示事件结果；否则约 1.2 秒后继续，最多三轮。
7. 退出、隐藏页面、重试、得到结果或卸载组件时取消待处理任务、丢弃过期结果并终止 Worker；退出体验时释放媒体轨道。
8. 命中 Boston Tea Party 后，`Page anchor` 默认关闭；用户打开后才动态加载图片追踪、识别参考封面并更新 Three.js 姿态。关闭开关或离开结果页会立即停止追踪并释放渲染资源。

Scan 状态包括 `idle / scanning / result / unmatched / profile / dialogue / timeline`。OCR 加载进度、稳定检测与错误独立记录。得到匹配结果后可以保留相机背景，不继续运行 OCR。

点击 `Exit scan` 返回 Library，并关闭相机、取消识别；即使先退出、后授权，延迟返回的媒体轨道也会被释放。页面隐藏后暂停相机，回来可以点击 `Resume` 继续。

本地 `/tests/scan-camera-browser-fixture.html` 用模拟相机画面和可控制的识别结果验证手机布局、成功、无匹配、识别异常及权限拒绝。`QA` 中可切换真实 OCR 来检查完整识别流程；`?visual=result&anchor=on` 仅供开发验收，会用参考封面作为明确标注的模拟相机背景并注入稳定姿态。测试页使用内存存档，不修改真实学习进度，也不加入生产入口。若替换参考封面，运行 `./scripts/project.ps1 install` 确保依赖完整，再执行 `.\scripts\project.ps1 compile:tracking` 重新生成 `.mind` 文件并重新构建。

## 七、扩展新的历史内容

### 新增可扫描事件

1. 在 `src/scanData.js` 的 `TIMELINE_EVENTS` 增加事件内容。
2. 在 `SCAN_EVENT_PRESETS` 增加稳定的 `eventId`、标题、年份、事件专属短语与辅助关键词。
3. 添加事件图片和英文音频，并在使用资源的组件中注册。
4. 检查 Library 学习图、挑战引用和统计分母是否需要同步更新。
5. 在 `tests/scan.test.mjs` 添加匹配、歧义与失败用例。

避免只使用 Boston、colonies 或年份等宽泛词作为主要识别依据。

### 新增历史单元

`src/learningData.js` 定义时代目录、能力与挑战；`src/learningState.js` 管理全局记录；`src/libraryState.js` 目前承担美国革命的内容适配。

发布其他时代前，需要补齐内容 ID、单元状态处理与渲染、图片和音频、测评映射、挑战目标与交叉链接，再将目录状态改为可用。仅新增一张时代卡片不代表该时代已实现。

## 八、测试与验收

```powershell
.\scripts\project.ps1 test
.\scripts\project.ps1 build
.\scripts\project.ps1 test:sites
```

目前包含 54 项应用测试与 4 项 Sites 测试。浏览器集成测试使用以下开发地址：

- `/tests/global-browser-fixture.html`：真实应用配合独立内存存档，避免测试成就污染用户记录。
- `/tests/harbor-browser-fixture.html`：直接渲染真实 HarborScene，适合桌面和手机横屏的建模、光照与性能复核，不写入学习记录。
- `/tests/ocr-browser-fixture.html`：本地 OCR 集成验证。
- `/tests/scan-camera-browser-fixture.html`：模拟相机、手机取景布局与成功 / 失败状态；QA 中可选择真实 OCR，测试画面不等于真机验收。

这些测试页是 Vite 开发入口，不是生产页面。

建议检查以下视口：

- `390 × 844`：手机竖屏；
- `844 × 390`：手机横屏；
- `1254 × 960`：桌面/平板参考尺寸。

自动化测试不能替代真机验收。上线后应在 Android Chrome 和 iPhone Safari 中检查摄像头授权、印刷英文识别、声音播放、手机转动和触摸操作。支持沉浸式 XR 的设备还需要单独验证会话进入与退出。

## 九、构建与 Vercel 部署

项目已关联 Vercel 的 `webxr-test`。以 `vercel.json` 为准：

- 框架：Vite；
- 云端构建命令：`pnpm run build`；
- 网站输出目录：`dist/client`；
- 权限策略：允许同源摄像头与 XR，禁用麦克风；
- 主站地址：[https://webxr-test-one.vercel.app/](https://webxr-test-one.vercel.app/)。

Windows 的 Corepack 权限问题不意味着 Vercel 构建环境也有同样问题。云端沿用 pnpm 锁文件，本地可以使用 PowerShell 启动器。

构建后应包含：

```text
dist/
├── client/
│   ├── index.html
│   └── assets/
│       └── ocr/eng.traineddata.gz
├── server/index.js
└── .openai/hosting.json
```

OCR Worker 与 WASM 位于带哈希的资源文件中；英文模型使用稳定路径，避免依赖第三方 CDN。

Vercel 发布的是网站构建结果，README 属于项目源文档，不会自动成为网站路由。需要通过已连接的 Vercel 发布能力或已登录的 Vercel CLI 从项目根目录部署，不要将凭据写入源文件。

`.openai/hosting.json`、`worker/index.js`、`scripts/prepare-sites-build.mjs` 与 `tests/sites-worker.test.mjs` 是 Sites 兼容层，修改应用时保留它们。

## 十、已知边界

- 只识别已配置的印刷英文事件，不支持手写、中文、人脸或任意实物识别。
- Boston Tea Party 提供默认关闭、会话级的参考封面图片追踪；它不是任意实物识别，也不包含平面命中测试、持久 WebXR 空间锚点或跨页面恢复。
- 3D 场景和生成式历史图片属于原型素材，不是历史现场的精确复原。
- 对话为预设问题与音频，不是实时大模型语音交谈。
- 只有美国革命单元完整可用，其余时代仍是预览。
- 浏览器、设备和授权状态会影响 WebXR 与方向传感器能力；保留摄像头或拖动回退。
- `localhost` 可用于本机摄像头开发，但手机访问普通 HTTP 局域网地址通常无法获得相同能力，请使用 HTTPS 生产地址。
- 生产构建仍有较大 JavaScript 分包的警告，后续可继续做按需加载与资源优化。
- 课堂或正式发布前，应对历史叙述、生成式形象与媒体授权进行人工审核。


### Scan 人物模型与循环动画

- 用户提供的原始文件位于 `src/assets/Meshy_AI_colonial_gentleman_re_biped/`，当前使用文件名包含 `Animation_Talk_with_Left_Hand_on_Hip_withSkin.fbx` 的模型；原始文件保持不变。
- 默认投影和 Page anchor 共用这个模型，约 5.17 秒的说话手势会无限循环。模型包含 24 根骨骼与内嵌贴图；这只是人物动作，未实现与 HeyGen 音频同步的口型。
- 当前只按需下载所选约 8.4 MB 的 FBX，首次加载会显示 “Bringing Samuel to life…”。下载失败显示重试按钮，事件资料、语音和时间线仍然可以使用。其余 Idle / Walking / Running 文件未接入当前结果页。
- 动画缩放和脚底定位放在独立父节点上，避免被骨骼动画覆盖。重新扫描、切换投影模式或离开页面会取消未完成的下载并释放动画、骨骼、模型和贴图资源；系统开启减少动态效果时人物保持静止姿态。
- FBXLoader 会提示原始资产的部分顶点超过四个骨骼权重，加载器将其截取并归一化到 WebGL 支持的四个权重。当前浏览器验收可正常播放；手机低性能设备的帧率与贴图显存占用仍需真机检查。

## 界面设计维护

统一视觉规范与继续开发入口见 [MemQuest 界面设计规范](./docs/DESIGN-SYSTEM.zh-CN.md)。公共设计变量集中在 `src/interface-theme.css`，应用和开发用 fixture 共用该样式。发布状态请以 GitHub 最新提交和 Vercel 当前生产部署为准。
