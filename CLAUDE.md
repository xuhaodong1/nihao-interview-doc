# CLAUDE.md

## 项目概述

NIHAO 面试宝典 — 基于 VitePress 的中文技术面试知识库，覆盖 iOS、Swift/ObjC、C++、计算机基础、AI/ML、系统设计、求职准备等方向。

- 线上地址：通过 GitHub Pages 部署
- 语言：中文内容 + 英文技术术语

## 常用命令

```bash
npm run docs:dev       # 启动本地开发服务器
npm run docs:build     # 构建生产版本
npm run docs:preview   # 预览构建结果
```

依赖：`vitepress ^1.6.4` + `vitepress-plugin-mermaid`（Mermaid 图表支持）。

## 项目结构

```
docs/                          # VitePress 内容根目录
├── .vitepress/
│   ├── config.mts             # 导航栏 + 侧边栏配置（新增文章必须更新）
│   └── theme/custom.css       # 全局自定义样式
├── public/images/             # 静态图片资源（SVG + PNG）
├── index.md                   # 首页（features 卡片列表）
├── ios/                       # iOS 开发
├── swift-objc/                # Swift / Objective-C
├── cpp/                       # C++
├── algorithm/                 # 数据结构与算法
├── network/                   # 计算机网络
├── os/                        # 操作系统
├── database/                  # 数据库
├── design-patterns/           # 设计模式
├── machine-learning/          # 机器学习
├── deep-learning/             # 深度学习
├── on-device-ai/              # 端智能
├── llm-agent/                 # LLM / AI Agent
├── system-design/             # 系统设计
├── resume/                    # 简历与求职
└── interview-prep/            # 面试准备
```

## 写作规范

### 新增文章流程

1. 在 `docs/<section>/` 下创建 `kebab-case.md` 文件
2. 更新 `docs/.vitepress/config.mts` 中对应 section 的 sidebar items
3. 如果是新 section，还需更新 nav 和 `docs/index.md` 的 features

### 文章结构（按知识点分章节 + 固定收尾）

```markdown
# 标题
> 一句话概括

（开头 1-2 段：类比破冰 + 为什么重要，不单独成章节）

## 知识点 A（如"向量运算""过拟合与欠拟合"）
## 知识点 B
...
## 面试高频问题（Q1-Q5，标注难度 ⭐）
## 一张表回顾
```

`##` 标题用知识点名称，不用"是什么""核心原理"等教学框架。

### 格式要求

- 用"你"称呼读者，短句为主，先结论后展开
- 中英文之间加空格，术语用 `行内代码`
- **代码块只放真正的代码**（可运行/可编译），不要在代码块中放大段文字描述
- 提示框：`::: tip` / `::: warning` / `::: danger` / `::: details`
- 对比类内容优先用表格

### 图表（按优先级）

1. **Mermaid**（简单图表，**≤6 个节点**）：直接写 ```` ```mermaid ```` 代码块，支持 graph、sequenceDiagram、classDiagram、stateDiagram-v2、pie 等。超过 6 个节点文字会非常小，必须改用 fireworks-tech-graph
2. **表格**：对比类、属性列表类内容
3. **fireworks-tech-graph**（节点 > 6 或复杂架构图）：生成 SVG + PNG，存放 `docs/public/images/`，引用 `/images/xxx.png`

## 参考素材

原始笔记位于 `/Users/xuhaodong/Developer/interview/`，按主题组织（如 `深度学习/`、`8股/`、`端智能/` 等）。写新文章前应先检查此目录是否有可参考的内容。

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并部署到 GitHub Pages（见 `.github/workflows/deploy.yml`）。

## NotebookLM 导入链接生成

线上地址为 `https://interview.nihao201.cn/`。当用户需要将某个模块的文章导入 NotebookLM 时，生成该模块下所有文章的线上链接（排除 `index.md`），格式为：

```
https://interview.nihao201.cn/<section>/<article>.html
```

例如 machine-learning 模块：
```
https://interview.nihao201.cn/machine-learning/basics.html
https://interview.nihao201.cn/machine-learning/math.html
```

## 注意事项

- `config.mts` 是核心配置文件，修改时注意括号匹配和逗号
- `ignoreDeadLinks: true` 已开启，但仍应避免创建死链
- `.claude/` 目录已被 `.gitignore` 排除
- 图片居中样式已在 `custom.css` 中全局配置（`.vp-doc img { display: block; margin: 16px auto; }`）
