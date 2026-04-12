import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'NIHAO 面试宝典',
  description: '全面的技术面试知识库',
  lang: 'zh-CN',
  base: '/nihao-interview-doc/',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'iOS', link: '/ios/' },
      { text: 'Swift / ObjC', link: '/swift-objc/' },
      { text: 'C++', link: '/cpp/' },
      {
        text: '计算机基础',
        items: [
          { text: '数据结构与算法', link: '/algorithm/' },
          { text: '计算机网络', link: '/network/' },
          { text: '操作系统', link: '/os/' },
          { text: '数据库', link: '/database/' },
          { text: '设计模式', link: '/design-patterns/' },
        ],
      },
      {
        text: 'AI',
        items: [
          { text: '深度学习', link: '/deep-learning/' },
          { text: '机器学习', link: '/machine-learning/' },
          { text: '端智能', link: '/on-device-ai/' },
        ],
      },
      {
        text: '求职准备',
        items: [
          { text: '简历与求职', link: '/resume/' },
          { text: '系统设计', link: '/system-design/' },
          { text: '面试准备', link: '/interview-prep/' },
        ],
      },
    ],

    sidebar: {
      '/ios/': [
        {
          text: 'iOS',
          items: [
            { text: '概览', link: '/ios/' },
            { text: 'ARC 与内存管理', link: '/ios/memory-management' },
            { text: '多线程与 GCD', link: '/ios/multithreading' },
            { text: 'RunLoop', link: '/ios/runloop' },
            { text: 'App 启动流程与优化', link: '/ios/app-launch' },
            { text: '渲染原理与离屏渲染', link: '/ios/rendering' },
            { text: '动画与 Core Animation', link: '/ios/animation' },
            { text: '事件传递与响应链', link: '/ios/event-handling' },
            { text: '网络编程与 HTTPS', link: '/ios/network' },
            { text: '数据持久化', link: '/ios/persistence' },
            { text: 'Crash 分析与治理', link: '/ios/crash-analysis' },
            { text: '架构模式', link: '/ios/architecture' },
            { text: '组件化与路由', link: '/ios/modularization' },
            { text: '性能优化', link: '/ios/performance' },
            { text: '包体积优化', link: '/ios/app-size' },
            { text: '热修复与动态化', link: '/ios/hotfix' },
            { text: 'Swift 与 ObjC 混编', link: '/ios/swift-objc-interop' },
            { text: '单元测试与 CI/CD', link: '/ios/testing' },
          ],
        },
      ],
      '/swift-objc/': [
        {
          text: 'Swift / ObjC',
          items: [
            { text: '概览', link: '/swift-objc/' },
            { text: 'Objective-C 语言特性', link: '/swift-objc/objc' },
            { text: 'Swift 语言特性', link: '/swift-objc/swift' },
            { text: 'Swift vs ObjC', link: '/swift-objc/swift-vs-objc' },
            { text: 'Block 与闭包', link: '/swift-objc/block' },
            { text: 'Swift 内存布局', link: '/swift-objc/swift-memory-layout' },
            { text: 'Swift Concurrency', link: '/swift-objc/swift-concurrency' },
          ],
        },
      ],
      '/cpp/': [
        {
          text: 'C++',
          items: [
            { text: '概览', link: '/cpp/' },
            { text: '快速入门', link: '/cpp/quick-start' },
            { text: '内存管理', link: '/cpp/memory' },
            { text: '面向对象', link: '/cpp/oop' },
            { text: '值语义与移动语义', link: '/cpp/move-semantics' },
            { text: '模板与泛型', link: '/cpp/templates' },
            { text: 'STL 容器与算法', link: '/cpp/stl' },
            { text: '指针与引用', link: '/cpp/pointers' },
            { text: '编译与链接', link: '/cpp/compilation' },
            { text: '并发编程', link: '/cpp/concurrency' },
            { text: '现代 C++ 特性', link: '/cpp/modern-cpp' },
          ],
        },
      ],
      '/algorithm/': [
        {
          text: '数据结构与算法',
          items: [
            { text: '概览', link: '/algorithm/' },
            { text: '数组与链表', link: '/algorithm/array-linkedlist' },
            { text: '栈与队列', link: '/algorithm/stack-queue' },
            { text: '哈希表', link: '/algorithm/hash-table' },
            { text: '树与二叉树', link: '/algorithm/tree' },
            { text: '图', link: '/algorithm/graph' },
            { text: '排序算法', link: '/algorithm/sorting' },
            { text: '二分查找', link: '/algorithm/binary-search' },
            { text: '动态规划', link: '/algorithm/dp' },
            { text: '贪心算法', link: '/algorithm/greedy' },
            { text: '回溯与递归', link: '/algorithm/backtracking' },
            { text: '双指针与滑动窗口', link: '/algorithm/two-pointers' },
          ],
        },
      ],
      '/network/': [
        {
          text: '计算机网络',
          items: [
            { text: '概览', link: '/network/' },
            { text: '网络分层模型', link: '/network/osi-model' },
            { text: 'TCP 与 UDP', link: '/network/tcp-udp' },
            { text: 'HTTP 与 HTTPS', link: '/network/http' },
            { text: 'DNS 解析', link: '/network/dns' },
            { text: 'Socket 编程', link: '/network/socket' },
            { text: '网络安全基础', link: '/network/security' },
          ],
        },
      ],
      '/os/': [
        {
          text: '操作系统',
          items: [
            { text: '概览', link: '/os/' },
            { text: '进程与线程', link: '/os/process-thread' },
            { text: '进程调度', link: '/os/scheduling' },
            { text: '内存管理', link: '/os/memory' },
            { text: '死锁', link: '/os/deadlock' },
            { text: '文件系统', link: '/os/filesystem' },
            { text: 'IO 模型', link: '/os/io-model' },
          ],
        },
      ],
      '/database/': [
        {
          text: '数据库',
          items: [
            { text: '概览', link: '/database/' },
            { text: 'SQL 基础', link: '/database/sql' },
            { text: '索引原理', link: '/database/index' },
            { text: '事务与锁', link: '/database/transaction' },
            { text: 'MySQL 调优', link: '/database/mysql' },
            { text: 'SQLite 与移动端存储', link: '/database/sqlite' },
            { text: 'NoSQL 基础', link: '/database/nosql' },
          ],
        },
      ],
      '/design-patterns/': [
        {
          text: '设计模式',
          items: [
            { text: '概览', link: '/design-patterns/' },
            { text: '创建型模式', link: '/design-patterns/creational' },
            { text: '结构型模式', link: '/design-patterns/structural' },
            { text: '行为型模式', link: '/design-patterns/behavioral' },
            { text: 'iOS 中的设计模式', link: '/design-patterns/ios-patterns' },
            { text: '实战与反模式', link: '/design-patterns/anti-patterns' },
          ],
        },
      ],
      '/deep-learning/': [
        {
          text: '深度学习',
          items: [
            { text: '概览', link: '/deep-learning/' },
            { text: '数学基础', link: '/deep-learning/math' },
            { text: '机器学习基础', link: '/deep-learning/ml-basics' },
            { text: '神经网络基础', link: '/deep-learning/neural-networks' },
            { text: '反向传播与优化', link: '/deep-learning/backprop' },
            { text: 'CNN', link: '/deep-learning/cnn' },
            { text: 'RNN 与序列模型', link: '/deep-learning/rnn' },
            { text: 'Transformer', link: '/deep-learning/transformer' },
            { text: '大语言模型', link: '/deep-learning/llm' },
            { text: '模型部署与端侧推理', link: '/deep-learning/deployment' },
          ],
        },
      ],
      '/machine-learning/': [
        {
          text: '机器学习',
          items: [
            { text: '概览', link: '/machine-learning/' },
            { text: '监督学习', link: '/machine-learning/supervised' },
            { text: '非监督学习', link: '/machine-learning/unsupervised' },
            { text: '集成学习', link: '/machine-learning/ensemble' },
            { text: '特征工程', link: '/machine-learning/feature-engineering' },
            { text: '模型评估与调优', link: '/machine-learning/evaluation' },
            { text: '概率图模型', link: '/machine-learning/probabilistic' },
            { text: '推荐系统', link: '/machine-learning/recommendation' },
          ],
        },
      ],
      '/on-device-ai/': [
        {
          text: '端智能',
          items: [
            { text: '概览', link: '/on-device-ai/' },
            { text: '模型压缩与量化', link: '/on-device-ai/compression' },
            { text: '端侧推理框架', link: '/on-device-ai/inference-framework' },
            { text: '模型转换与优化', link: '/on-device-ai/model-conversion' },
            { text: '端侧性能调优', link: '/on-device-ai/performance' },
            { text: '端智能应用实践', link: '/on-device-ai/practice' },
          ],
        },
      ],
      '/system-design/': [
        {
          text: '系统设计',
          items: [
            { text: '概览', link: '/system-design/' },
            { text: '系统设计方法论', link: '/system-design/methodology' },
            { text: '设计即时通讯系统', link: '/system-design/im' },
            { text: '设计信息流系统', link: '/system-design/feed' },
            { text: '设计短链服务', link: '/system-design/url-shortener' },
            { text: '设计秒杀系统', link: '/system-design/flash-sale' },
          ],
        },
      ],
      '/resume/': [
        {
          text: '简历与求职',
          items: [
            { text: '概览', link: '/resume/' },
            { text: '简历撰写技巧', link: '/resume/writing' },
            { text: '项目经验包装', link: '/resume/project-experience' },
          ],
        },
      ],
      '/interview-prep/': [
        {
          text: '面试准备',
          items: [
            { text: '概览', link: '/interview-prep/' },
            { text: '行为面试与 STAR 法则', link: '/interview-prep/behavioral' },
            { text: '算法面试策略', link: '/interview-prep/algorithm' },
            { text: '软技能与沟通', link: '/interview-prep/soft-skills' },
            { text: 'HR 面试与薪资谈判', link: '/interview-prep/hr-salary' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/' },
    ],

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
      label: '目录',
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
  },
})
