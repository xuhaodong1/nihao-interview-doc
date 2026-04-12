import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'NIHAO 面试宝典',
  description: '全面的技术面试知识库',
  lang: 'zh-CN',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'iOS', link: '/ios/' },
      { text: 'C++', link: '/cpp/' },
      { text: '深度学习', link: '/deep-learning/' },
      { text: '机器学习', link: '/machine-learning/' },
      { text: '端智能', link: '/on-device-ai/' },
    ],

    sidebar: {
      '/ios/': [
        {
          text: 'iOS / Swift / ObjC',
          items: [
            { text: '概览', link: '/ios/' },
            { text: 'Runtime 机制', link: '/ios/runtime' },
            { text: '内存管理', link: '/ios/memory-management' },
            { text: 'Block 与闭包', link: '/ios/block' },
            { text: '多线程与并发', link: '/ios/multithreading' },
            { text: 'RunLoop', link: '/ios/runloop' },
            { text: '网络与 HTTPS', link: '/ios/network' },
            { text: '渲染与 UI', link: '/ios/rendering' },
            { text: '事件处理', link: '/ios/event-handling' },
            { text: 'App 启动流程', link: '/ios/app-launch' },
            { text: 'Crash 分析', link: '/ios/crash-analysis' },
            { text: '架构模式', link: '/ios/architecture' },
            { text: 'Swift vs ObjC', link: '/ios/swift-vs-objc' },
            { text: 'Swift 并发', link: '/ios/swift-concurrency' },
            { text: 'Swift 内存布局', link: '/ios/swift-memory-layout' },
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
          ],
        },
      ],
      '/on-device-ai/': [
        {
          text: '端智能',
          items: [
            { text: '概览', link: '/on-device-ai/' },
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
