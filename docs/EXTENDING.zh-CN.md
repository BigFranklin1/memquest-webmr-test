# MemQuest 模块扩展手册

核对日期：2026-09-07。面向设计背景、编程经验较少的维护者。所有路径以项目根目录为起点；代码中的英文 ID 必须精确一致。

## 1. 先判断你要扩展哪一层

| 目标 | 必改位置 | 不会自动完成的事情 |
| --- | --- | --- |
| 同一事件增加一本书封面 | `src/assets/tracking/`、`src/anchorTargets.js`，重新编译 `.mind` 和缩略图 | 不会增加新事件或角色；只复制 PNG 没有效果 |
| 更换一个角色的 3D 外观/动作 | 模型资源、`src/SamuelAdamsProjectionModel.js` | FBX 不能直接换成 GLB 路径；也不会自动更新人物图片和声音 |
| Scan 增加一名角色 | 人物数据、`src/scanCharacters.js`、模型加载器、`src/ScanExperience.jsx`、锚点 `subjectId` | 不会自动出现在 Library |
| Library 增加人物词条 | `src/revolutionData.js`、`src/peopleProfiles.js`、`src/PeopleView.jsx` 与图片 | 不会自动变成 OCR 匹配角色 |
| 增加可扫描事件 | `src/scanData.js` 的两组数据、两个时间线界面的图片和声音映射 | 不会自动有参考图、3D 场景或练习题 |
| 增加另一个时代 | 内容、状态、渲染、存档、全局目录、挑战、图片与声音 | 仅将 `coming-soon` 改成 `available` 不够 |

现有 Scan 映射：`stamp-act` → Samuel；`massacre` → John；`tea-party` → Samuel；`congress` → Samuel（没有参考图锚定）。前三个事件各有两张参考图，每次跟踪其中一张。Library 已有五个人物、七条证据、四个事件、四个港口线索；Memory Check 仍是五题。

## 2. 理解关联，不要只替换图片

```text
相机文字 → OCR 事件匹配 → eventId（例如 massacre）
                          ├─ scanCharacters.js → John 的介绍与预设问答
                          ├─ 模型加载器 → John 的 FBX 与动画
                          ├─ ScanExperience.jsx → John 的语音与结果控件
                          └─ 开启 Page anchor
                              → anchorTargets.js → 对应事件的 .mind
                              → targetIndex → 参考图尺寸 → 人物位置与大小
```

OCR 负责回答“这是什么事件”；图像追踪负责回答“这张登记过的图片在哪里、朝向如何”。二者不是同一种识别。默认仍是屏幕投影；Page anchor 是可关闭的会话内图像姿态，不是桌面平面、永久锚点或真实世界地图。

## 3. 实操 A：为 Boston Massacre 增加第三张参考图

1. 保存当前修改，在 GitHub Desktop 新建例如 `codex/add-massacre-cover` 分支。不要直接覆盖旧封面。
2. 准备拥有使用权限、清晰、平整、纹理丰富的封面 PNG。尽量保留完整边界，避免反光、折痕、大片空白和重复图案。当前编译脚本只读取 PNG，不能只把 JPEG 后缀改成 `.png`。
3. 放到 `src/assets/tracking/`，使用简短英文文件名，如 `massacre-new-cover.png`。
4. 打开 `src/anchorTargets.js`，在 **massacre 的 images 数组末尾**增加下面一项。不是另建一个同名事件。

```js
{ id: "massacre-new-cover", file: "massacre-new-cover.png", label: "书名的英文显示文字" },
```

5. 保持 `eventId: "massacre"`、`subjectId: "john-adams"` 和 `compiledFile: "massacre-targets.mind"`。`images` 数组顺序就是编译文件里的 `targetIndex` 顺序，不能只改一边。
6. 在项目根目录的 PowerShell 执行：

```powershell
node scripts/compile-image-target.mjs --event massacre
node scripts/create-anchor-thumbnails.mjs
.\scripts\project.ps1 test
.\scripts\project.ps1 build
.\scripts\project.ps1 test:sites
```

7. 输出应包含更新后的 `massacre-targets.mind` 和 `massacre-new-cover-thumb.png`。`anchorTargetAssets.js` 会按文件名关联 URL，不必手动写打包后的带哈希文件名。
8. **当前测试和提示词有“两张图”的假设**：请让 Codex 同步更新 `tests/anchorTargets.test.mjs`、`tests/scan-camera-browser-fixture.jsx` 中的目标数量边界，以及 `ScanExperience.jsx` 的 “either book cover” 文案。真实追踪器接受 `targetCount`，但测试夹具不能照旧只运行 0、1。
9. 每张图单独验证；移出画面后再换下一张，确认角色不变、模型能恢复。还要验证旧封面没有失效。

常见误区：一本新书的封面如果没有可匹配的英文标题，OCR 可能先失败，根本还没进入 Page anchor。需要增加事件专属匹配短语，而不是让任何文字都命中；年份和 “Boston” 这样的通用词不能作为充分依据。

## 4. 实操 B：替换 John 的 3D 模型或动画

### 素材准备

优先提供带骨骼、带蒙皮（skinning）和贴图的 FBX。当前人物包里带 `withSkin` 的说话动画文件包含模型与动作；没有实现“自动搜索文件夹内所有动画”，也没有自动骨骼重定向。保留原始资产，另建版本文件夹，不要删掉已经能工作的模型。

当前实际使用：

| 角色 | 模型文件夹 | 加载的动作 |
| --- | --- | --- |
| Samuel | `src/assets/Meshy_AI_colonial_gentleman_re_biped/` | `Talk_with_Left_Hand_on_Hip_withSkin.fbx` |
| John | `src/assets/Meshy_AI_Colonial_Statesman_biped/` | `Talk_with_Right_Hand_Open_withSkin.fbx` |

完整文件名前缀见文件夹，不要照表中的动作后缀拼猜完整路径。

### 修改位置与规则

1. `src/SamuelAdamsProjectionModel.js` 名字是历史遗留，**现在同时加载两位人物**。更换对应的 `...?url` import 即可选择另一份 FBX；不要替换另一人的路径。
2. 如要新增第三人，需把当前 `subjectId === "john-adams"` 的二选一逻辑改成明确的角色资源表。现在未知角色会回退到 Samuel，不能只添加一个名字就认为接入成功。
3. 当前加载器在 FBX 中优先找名字含 `talk` 的动画，否则使用第一段；`LoopRepeat` 无限循环。新素材有多段动作时，应按真实 clip 名称显式选定，不能凭文件名假定内容。
4. 模型按包围盒统一身高，并把缩放、中心位置放在动画层级外的父组。**不要把归一化缩放直接写到会被骨骼动画更新的根节点**。
5. 屏幕投影见 `ScanArtifactProjection.jsx`（目标身高 2.62）；图像姿态见 `ScanImageAnchorProjection.jsx`（目标身高 0.54，再按实际目标宽度换算）。这些是场景单位，不是“真人 2.62 米”。两个模式都必须验收。
6. 当前路径支持内嵌纹理。如果新 FBX 使用外部贴图，需要添加资源路径/LoadingManager 映射，并确认所有贴图都随站点发布。模型发白时先查加载错误，不要通过过曝灯光掩盖问题。
7. 若素材只有 GLB/GLTF，需要改用 GLTFLoader，读取 `gltf.scene` 与 `gltf.animations`；不能将 GLB 交给 FBXLoader。跨骨骼动作需要单独重定向，属于额外开发。
8. 只按需加载选中的说话文件。手机上避免同时加载整个动画包、超大贴图或额外渲染层；移动端帧率必须真机验证。

验收：有贴图、正面方向正确、脚在底座附近、没有飞走/缩放跳变、动作超过两个周期仍播放、两种投影模式一致、减少动态效果设置下不持续动画、离开页面后资源释放。动画只是循环手势，不等于嘴型同步。

## 5. 实操 C：新增或维护角色文案与英文语音

- Samuel 的基础资料和问答在 `scanData.js`；John 在 `johnAdamsData.js`。
- `scanCharacters.js` 决定哪个 **matchedEventId** 使用哪个人物。不要用用户在时间线随手浏览的 `selectedEventId` 更换扫描角色。
- `ScanExperience.jsx` 当前通过 import 映射音频。新增角色必须同步其介绍、问题、答案和音频映射；只填数据不会自动播放。
- John 的可追溯清单是 `src/assets/voice/john-adams-manifest.json`：文本、文件、声音 ID、语速、时长和资料来源。修改文字后需重新生成对应音频，并更新清单和字幕。
- 英文为主，HeyGen 是开发时生成工具，**网站运行时不用 API 密钥**。不要把密钥提交 GitHub，不要上传摄像头画面。浏览器语音合成与麦克风保持关闭。
- 不依赖下载链接的后缀判断格式：John 的 HeyGen 链接以 `.wav` 结尾，实际是 MP3，项目已正确命名 `.mp3`。检查浏览器能解码、能点击播放、切页后停止，再发布。
- 配音和肖像都属于教学艺术化重现；第一人称对白不是历史原话。保留来源与限制说明。

## 6. 实操 D：Library 人物、证据、时间线

Library 的 John Adams 是一套完整范例：

1. `revolutionData.js` 的 `REVOLUTION_PEOPLE`：ID、生卒年、角色、立场、简介、目标、矛盾、`eventIds`、`evidenceIds`。
2. `peopleProfiles.js`：长介绍、两个角色说明、五个关系节点，以及可选的 `eventNotes`。当前网络布局和测试按五个节点设计，增加第六个需要同步布局。
3. `PeopleView.jsx` 的 `PORTRAITS`：注册肖像和裁切方式。John 与 Samuel 采用同一宽幅、右侧人物的海报样式。仅新增图片文件不会注册人物头像。
4. 新画像放 `src/assets/archive/`，记录生成方式/许可、参考风格和提示词。深蓝渐变是 CSS 叠加，不把按钮和文字画进素材；保持 “Historical interpretation” 标注。
5. 关系节点若能跳转人物，必须有真实 `personId`；仅表达历史背景就用图标与说明，避免虚构两人见过面或合作。
6. `REVOLUTION_EVIDENCE` 配置证据的来源类型、关联事件和人物、它能说明什么、不能证明什么。John 的 `adams-defense` 使用档案转录并提供 `sourceUrl`，不是新港口交互物体。
7. 3 月 5 日是惨案日期，John 的辩护发生在随后审判；`eventNotes.massacre` 用来明确区分，而不是改动整个事件日期。
8. 全局 `learningData.js` 从这些数组计算目录；增加词条会增加探索分母。新词条不会自动标记已读，也不修改已有练习题答案。`learningState.js` 保留已获得的单元完成记录；旧用户的探索百分比可能下降，这是新增内容，不是存档丢失。

## 7. 可以直接交给 Codex 的需求模板

> 请先读取 AGENTS.md 和 docs/EXTENDING.zh-CN.md。我只想扩展【事件/人物/模型/参考图】，素材在【完整路径】。保持其他已验证功能不变。请列出要改的数据、图片、动画和语音映射；实现后验证旧内容回归、手机 390×844 与 844×390、资源释放和生产构建。请告诉我哪些是真机测试、哪些是模拟测试。未经我明确要求不要提交或部署。

> 请为 massacre 增加第三张参考封面，不新增事件、不改角色。注册并重新编译完整目标集，生成缩略图，去掉测试和文案中只支持两张的假设；每张图依次识别并检查丢失重获。完成后先给本地验收结果。

## 8. 发布前逐项确认

- [ ] 原始素材有权限，文件名大小写一致；没有绝对 `E:/...` 路径写进网页。
- [ ] 图像、编译 `.mind`、缩略图、人物/事件 ID 完全对应。
- [ ] 模型和语音在独立浏览器加载成功，没有仅本机存在的依赖。
- [ ] 旧 Samuel、两个 John 封面、无法匹配、丢失重获、切页停止都检查过。
- [ ] `test`、`build`、`test:sites` 通过。已有大 JS 分包警告不是可忽略手机性能的理由。
- [ ] Android/iPhone 在 HTTPS 上测实体书、相机权限、横竖屏和声音；模拟画面不得写成真机通过。
- [ ] README、交接文档、来源清单、测试记录与实际功能一致。
- [ ] 先看 `git status` 和差异，再选择性提交。排除 `.env`、`.vercel`、`node_modules`、`dist`、`.artifacts`、无关 ZIP 和旧 PDF。不要用 `git add .` 把所有东西塞进去。
- [ ] Push 后核对 GitHub 提交号；Vercel 等待 READY 后核对正式域名与同一提交；再打开线上 People 和相机页。

保存文件 ≠ Git commit ≠ GitHub push ≠ Vercel 发布。任何一步失败都不要声称四处版本已同步。
