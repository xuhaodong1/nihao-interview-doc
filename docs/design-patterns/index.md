# 设计模式

> 前人总结的"最佳套路"——用成熟的方案解决反复出现的设计问题，写出可扩展、易维护的代码。

设计模式不是发明出来的，而是从大量实践中**提炼**出来的。就像下棋有定式，编程也有定式——遇到"需要创建对象但不想暴露细节"就用工厂，遇到"需要动态扩展功能"就用装饰器。

## GoF 23 种设计模式总览

### 创建型模式（5 种）

> 解决"如何创建对象"的问题

| 模式 | 一句话说明 | iOS 常见场景 |
|------|---------|-------------|
| **单例** (Singleton) | 全局唯一实例 | `UIApplication.shared`、`UserDefaults.standard` |
| **工厂方法** (Factory Method) | 子类决定创建什么对象 | `NSNumber numberWith...` |
| **抽象工厂** (Abstract Factory) | 创建一族相关对象 | UI 主题工厂（深色/浅色） |
| **建造者** (Builder) | 分步构建复杂对象 | `URLComponents`、`NSAttributedString` |
| **原型** (Prototype) | 通过复制创建新对象 | `NSCopying` 协议 |

### 结构型模式（7 种）

> 解决"如何组合类和对象"的问题

| 模式 | 一句话说明 | iOS 常见场景 |
|------|---------|-------------|
| **适配器** (Adapter) | 让接口不兼容的类协同工作 | Delegate 模式 |
| **装饰器** (Decorator) | 动态添加功能，不改原类 | `NSAttributedString`、Category |
| **代理** (Proxy) | 控制对另一个对象的访问 | `NSProxy`、懒加载 |
| **外观** (Facade) | 为复杂子系统提供简单接口 | SDK 封装层 |
| **桥接** (Bridge) | 抽象与实现分离 | 跨平台 UI 抽象 |
| **组合** (Composite) | 树形结构，统一处理单个和组合对象 | `UIView` 视图树 |
| **享元** (Flyweight) | 共享细粒度对象，节省内存 | `UITableViewCell` 复用 |

### 行为型模式（11 种）

> 解决"对象之间如何通信"的问题

| 模式 | 一句话说明 | iOS 常见场景 |
|------|---------|-------------|
| **观察者** (Observer) | 一对多通知 | `NotificationCenter`、KVO |
| **策略** (Strategy) | 算法封装，运行时切换 | 排序比较器、网络请求策略 |
| **命令** (Command) | 请求封装为对象 | `NSInvocation`、Target-Action |
| **责任链** (Chain of Responsibility) | 请求沿链传递 | 事件响应链 `UIResponder` |
| **迭代器** (Iterator) | 顺序访问集合元素 | `NSEnumerator`、`for-in` |
| **模板方法** (Template Method) | 定义骨架，子类实现细节 | `UIViewController` 生命周期 |
| **状态** (State) | 状态改变行为 | 播放器状态机 |
| **中介者** (Mediator) | 减少对象间直接依赖 | `UINavigationController` |
| **备忘录** (Memento) | 保存和恢复状态 | `NSCoding`、`Codable` |
| **访问者** (Visitor) | 不修改类就添加新操作 | AST 遍历 |
| **解释器** (Interpreter) | 定义语法并解释执行 | 正则表达式、NSPredicate |

## 内容导航

| 主题 | 核心内容 |
|------|---------|
| [创建型模式](/design-patterns/creational) | 单例、工厂、抽象工厂、建造者、原型的原理与实现 |
| [结构型模式](/design-patterns/structural) | 适配器、装饰器、代理、外观、桥接、组合、享元 |
| [行为型模式](/design-patterns/behavioral) | 观察者、策略、命令、责任链、状态、模板方法等 |
| [iOS 中的设计模式](/design-patterns/ios-patterns) | MVC/MVVM/MVP、Delegate、Target-Action、KVO 等 iOS 特有模式 |
| [实战与反模式](/design-patterns/anti-patterns) | 常见滥用场景、过度设计、SOLID 原则实践 |

## 六大设计原则（SOLID + 迪米特）

| 原则 | 含义 | 白话版 |
|------|------|-------|
| **S** — 单一职责 | 一个类只做一件事 | 别让一个类又管 UI 又管网络 |
| **O** — 开闭原则 | 对扩展开放，对修改关闭 | 加新功能不改老代码 |
| **L** — 里氏替换 | 子类能替代父类 | 用到父类的地方换成子类不会出 bug |
| **I** — 接口隔离 | 接口要小而专 | 别强迫类实现它不需要的方法 |
| **D** — 依赖倒置 | 依赖抽象而非具体 | 面向协议/接口编程 |
| **LoD** — 迪米特法则 | 最少知识原则 | 只和直接朋友说话，不和陌生人说话 |

::: tip 面试关键
面试不会让你背诵 23 种模式的定义。重点是：**遇到什么问题用什么模式，为什么选这个模式，在项目中怎么用的**。准备 2-3 个你在项目中实际使用设计模式的案例比背概念更有说服力。
:::
