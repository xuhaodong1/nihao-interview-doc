# ARC 与内存管理

> iOS 内存管理的核心机制——理解 ARC 如何让你写更少的代码，同时避免内存泄漏和崩溃。

ARC（Automatic Reference Counting，自动引用计数）是编译器帮你管理内存的机制。每个对象都有一个"被需要的次数"（引用计数），有人用就 +1，没人用就 -1，降到 0 就自动清理掉。

在 ARC 之前，iOS 开发者需要手动调用 `retain`/`release` 来管理对象生命周期（MRC），极易出错。ARC 在编译期自动插入这些调用，让你专注于业务逻辑。

```objc
// MRC 时代：手动管理，容易漏掉 release
- (void)mrcExample {
    NSObject *obj = [[NSObject alloc] init];  // retainCount = 1
    [obj retain];                              // retainCount = 2
    [obj release];                             // retainCount = 1
    [obj release];                             // retainCount = 0，对象释放
}

// ARC 时代：编译器自动处理
- (void)arcExample {
    NSObject *obj = [[NSObject alloc] init];
    // 方法结束时，编译器自动插入 [obj release]
}
```

::: warning 常见误区
ARC 不等于"不用管内存"。ARC 解决了 `retain`/`release` 的手动调用，但**循环引用**仍然需要你自己处理。
:::

## 内存布局

<img src="/images/ios-memory-layout.png" alt="iOS 进程内存布局" style="max-width: 420px;" />

iOS 进程的内存从低地址到高地址依次是：

| 区域 | 存放内容 | 特点 |
|------|---------|------|
| 代码区（Text） | 编译后的机器码、常量 | 只读 |
| 数据区（Data） | 已初始化的全局/静态变量 | 可读写 |
| BSS 区 | 未初始化的全局/静态变量 | 程序启动时清零 |
| 堆区（Heap） | 动态分配的对象（`alloc`/`malloc`） | 向上增长，开发者管理 |
| 栈区（Stack） | 局部变量、函数参数 | 向下增长，系统自动管理 |

```objc
- (void)memoryExample {
    int localVar = 10;        // 栈上
    NSObject *obj = [[NSObject alloc] init];
    // obj 指针在栈上，指向的对象在堆上
}
```

堆和栈的核心区别：

| 对比项 | 栈 | 堆 |
|-------|-----|-----|
| 管理方式 | 系统自动管理 | 开发者管理（ARC 辅助） |
| 分配速度 | 快（移动栈指针） | 慢（查找空闲块） |
| 空间大小 | 较小（~1MB） | 较大（受系统限制） |
| 碎片问题 | 无 | 有 |

## 引用计数原理

每个 OC 对象都有一个引用计数器，记录"有多少指针指向我"：

| 操作 | 引用计数变化 |
|------|------------|
| `alloc`/`new`/`copy` | +1 |
| `retain` | +1 |
| `release` | -1 |
| `autorelease` | 稍后 -1 |
| `dealloc` | 计数为 0 时调用 |

**引用计数存在哪？** 在 64 位系统中有两种存储位置：

![isa 指针结构](/images/isa-pointer-layout.png)

1. **isa 指针中**（优化的非指针型 isa）：`extra_rc` 字段占 19 位，最多存储 2^19 的计数
2. **Side Table 中**：当 `extra_rc` 溢出时，引用计数转移到全局的 Side Table 哈希表

```cpp
// isa 指针结构（ARM64）
union isa_t {
    struct {
        uintptr_t nonpointer        : 1;   // 是否优化的 isa
        uintptr_t has_assoc         : 1;   // 是否有关联对象
        uintptr_t has_cxx_dtor      : 1;   // 是否有 C++ 析构函数
        uintptr_t shiftcls          : 33;  // 类指针
        uintptr_t magic             : 6;   // 调试用
        uintptr_t weakly_referenced : 1;   // 是否有弱引用
        uintptr_t deallocating      : 1;   // 是否正在释放
        uintptr_t has_sidetable_rc  : 1;   // 引用计数是否在 Side Table
        uintptr_t extra_rc          : 19;  // 额外引用计数（实际 RC - 1）
    };
};
```

## ARC 与编译器

ARC 的本质是**编译器在编译期自动插入内存管理代码**：

```objc
// 你写的代码
- (void)example {
    NSObject *obj = [[NSObject alloc] init];
    [self doSomething:obj];
}

// 编译器处理后（伪代码）
- (void)example {
    NSObject *obj = [[NSObject alloc] init];  // RC = 1
    [self doSomething:obj];
    objc_release(obj);  // ← 编译器自动插入
}
```

属性赋值也一样：

```objc
// self.name = @"Tom"; 编译器处理后：
NSString *tmp = @"Tom";
objc_retain(tmp);       // 新值 retain
objc_release(_name);    // 旧值 release
_name = tmp;
```

## 所有权修饰符

| 属性修饰符 | 所有权修饰符 | 说明 |
|-----------|------------|------|
| `strong` | `__strong` | 强引用，默认值 |
| `copy` | `__strong` | 拷贝后强引用 |
| `weak` | `__weak` | 弱引用，对象释放后自动置 nil |
| `assign` | `__unsafe_unretained` | 值类型用，不安全引用 |

## copy 语义

面试高频问题："为什么 `NSString` 属性要用 `copy` 而不是 `strong`？"

`copy` 修饰符在赋值时会调用 `copy` 方法生成一份新的不可变副本，防止外部持有的可变版本被意外修改：

```objc
@property (nonatomic, copy) NSString *name;

NSMutableString *mutableName = [NSMutableString stringWithString:@"Tom"];
self.name = mutableName;       // 实际存储的是 copy 后的不可变副本
[mutableName appendString:@"Cat"];
NSLog(@"%@", self.name);       // 输出 "Tom"，不受影响
```

如果用 `strong`，`self.name` 和 `mutableName` 指向同一个对象，外部修改会影响内部状态。

**深拷贝 vs 浅拷贝：**

| 操作 | 不可变对象 | 可变对象 |
|------|----------|---------|
| `copy` | 浅拷贝（返回自身） | 深拷贝（新不可变对象） |
| `mutableCopy` | 深拷贝（新可变对象） | 深拷贝（新可变对象） |

```objc
NSArray *arr = @[@1, @2];
NSArray *copyArr = [arr copy];             // 浅拷贝，同一对象
NSMutableArray *mCopyArr = [arr mutableCopy]; // 深拷贝，新对象

NSMutableArray *mArr = [NSMutableArray arrayWithArray:arr];
NSArray *copyMArr = [mArr copy];           // 深拷贝，新不可变对象
NSMutableArray *mCopyMArr = [mArr mutableCopy]; // 深拷贝，新可变对象
```

::: warning 容器的深拷贝只是"单层深拷贝"
`copy`/`mutableCopy` 对容器只拷贝容器本身，内部元素仍然是指针拷贝（浅拷贝）。真正的完全深拷贝需要用 `NSKeyedArchiver` 或递归 copy。
:::

自定义对象支持 `copy` 需要实现 `NSCopying` 协议：

```objc
@interface Person : NSObject <NSCopying>
@property (nonatomic, copy) NSString *name;
@end

@implementation Person
- (id)copyWithZone:(NSZone *)zone {
    Person *copy = [[Person allocWithZone:zone] init];
    copy.name = self.name;
    return copy;
}
@end
```

## atomic vs nonatomic

`atomic` 和 `nonatomic` 控制属性的 getter/setter 是否加锁：

```objc
// atomic（默认）：getter/setter 内部加自旋锁
@property (atomic, strong) NSString *name;

// nonatomic：不加锁，性能更好
@property (nonatomic, strong) NSString *name;
```

`atomic` 的 setter 实现（简化）：

```cpp
void objc_setProperty_atomic(id self, SEL _cmd, id newValue) {
    spinlock_t& lock = PropertyLocks[GOODHASH(self)];
    lock.lock();
    id oldValue = *slot;
    *slot = newValue;
    lock.unlock();
    objc_release(oldValue);
}
```

| 对比项 | atomic | nonatomic |
|-------|--------|-----------|
| 线程安全 | setter/getter 原子性 | 不保证 |
| 性能 | 慢（加锁开销） | 快 |
| 实际使用 | 几乎不用 | 绝大多数场景 |

::: warning atomic 不等于线程安全
`atomic` 只保证 getter/setter 的原子性，不保证业务逻辑的线程安全。比如 `self.array = @[]` 是安全的，但 `[self.array addObject:obj]` 不安全。真正的线程安全需要用锁或 GCD。
:::

## 弱引用实现

![weak 引用生命周期](/images/weak-ref-lifecycle.png)

`weak` 指针的"对象释放后自动置 nil"是怎么做到的？靠的是 **Side Table 中的弱引用表**：

```cpp
struct SideTable {
    spinlock_t slock;           // 自旋锁
    RefcountMap refcnts;        // 引用计数表
    weak_table_t weak_table;    // 弱引用表
};
```

注册流程：

1. `__weak id weakObj = obj;` 时，编译器调用 `objc_initWeak`
2. 将 `weakObj` 的地址注册到 `obj` 对应的 `weak_table` 中
3. 设置 `obj` 的 `isa.weakly_referenced = true`

清理流程：

1. 对象引用计数降到 0，触发 `dealloc`
2. `dealloc` → `clearDeallocating` → 遍历弱引用表
3. 将所有指向该对象的 `weak` 指针**置为 nil**
4. 从表中移除该条目

```cpp
// 对象释放时清理弱引用（简化）
void weak_clear_no_lock(weak_table_t *weak_table, id referent) {
    weak_entry_t *entry = weak_entry_for_referent(weak_table, referent);
    // 将每个弱引用指针置为 nil
    for (size_t i = 0; i < count; ++i) {
        if (*referrers[i] == referent) {
            *referrers[i] = nil;  // ← 关键：置为 nil
        }
    }
    weak_entry_remove(weak_table, entry);
}
```

::: tip weak vs assign
`weak` 释放后自动置 nil（安全），`assign` 释放后变成野指针（危险）。对象类型永远用 `weak`，`assign` 只用于值类型（`int`、`CGFloat` 等）。
:::

## dealloc 调用链

当引用计数降到 0，对象的销毁经过一条完整的调用链：

```cpp
- dealloc
    └── _objc_rootDealloc
        └── object_dispose
            └── objc_destructInstance
                ├── 调用 C++ 析构函数（如果有）
                ├── 移除关联对象（Associated Objects）
                └── clearDeallocating
                    ├── 将所有 weak 指针置为 nil
                    └── 清理 Side Table 中的引用计数
            └── free(obj)  // 释放堆内存
```

关键步骤拆解：

1. **C++ 析构**：如果对象包含 C++ 成员（`isa.has_cxx_dtor = true`），先调用析构函数
2. **关联对象**：如果有关联对象（`isa.has_assoc = true`），调用 `_object_remove_assocations` 移除所有关联
3. **弱引用清理**：如果有弱引用（`isa.weakly_referenced = true`），遍历弱引用表将所有 `weak` 指针置为 nil
4. **引用计数清理**：如果引用计数存在 Side Table 中（`isa.has_sidetable_rc = true`），从表中删除
5. **释放内存**：调用 `free()` 归还堆内存

::: tip dealloc 中该做什么
ARC 下 `dealloc` 不需要调用 `[super dealloc]`（编译器自动处理）。通常只需要移除通知观察者、销毁 C 资源（`CFRelease`、`free`）、关闭文件句柄等 ARC 管不到的事情。
:::

## 自动释放池

`@autoreleasepool` 实现延迟释放：对象调用 `autorelease` 后不会立即释放，而是等到池子 `drain` 时统一发送 `release`。

![AutoreleasePoolPage 结构](/images/autorelease-pool.png)

底层数据结构是 `AutoreleasePoolPage`——每页 4KB，多页组成双向链表：

```cpp
class AutoreleasePoolPage {
    id *next;                           // 下一个可存放对象的位置
    pthread_t const thread;             // 所属线程
    AutoreleasePoolPage *parent;        // 父页面
    AutoreleasePoolPage *child;         // 子页面
};

// @autoreleasepool {} 编译器转换为：
void *pool = objc_autoreleasePoolPush();   // 插入 POOL_BOUNDARY 哨兵
// ... 代码块
objc_autoreleasePoolPop(pool);             // 从哨兵位置开始，逐个 release
```

**主线程 RunLoop 自动管理 AutoreleasePool**：

- `Entry`（进入循环）：创建池子
- `BeforeWaiting`（即将休眠）：Pop 旧池，Push 新池，释放这一轮事件中产生的临时对象
- `Exit`（退出循环）：Pop 池子

## Tagged Pointer

对于小对象（小整数、短字符串），在堆上分配 16+ 字节太浪费。Tagged Pointer 将**数据直接编码在指针的 8 字节里**，不需要堆分配、不需要引用计数管理。

```objc
NSNumber *num1 = @1;                  // Tagged Pointer，值直接存在指针里
NSNumber *num2 = @(NSIntegerMax);     // 普通堆对象，值太大放不下
```

| 对比项 | 普通对象 | Tagged Pointer |
|-------|---------|---------------|
| 内存占用 | 16+ bytes | 8 bytes |
| 堆分配 | 需要 | 不需要 |
| 引用计数 | 需要 | 不需要 |
| 多线程安全 | 需要加锁 | 天然安全 |

## 循环引用实战

![循环引用三大场景](/images/retain-cycle.png)

### delegate 未用 weak

```swift
// ❌ delegate 默认 strong，导致循环引用
class Downloader {
    var delegate: DownloadDelegate?  // strong
}

class ViewController: UIViewController, DownloadDelegate {
    let downloader = Downloader()
    override func viewDidLoad() {
        downloader.delegate = self  // VC → Downloader → VC 循环引用
    }
}

// ✅ 修复：delegate 用 weak
class Downloader {
    weak var delegate: DownloadDelegate?
}
```

### 闭包捕获 self

```swift
// ❌ 闭包强引用 self
class ViewController: UIViewController {
    var name = "VC"
    var closure: (() -> Void)?

    override func viewDidLoad() {
        closure = {
            print(self.name)  // self → closure → self 循环引用
        }
    }
}

// ✅ 修复：capture list 中用 weak
closure = { [weak self] in
    guard let self else { return }
    print(self.name)
}
```

### Timer 强引用 target

```swift
// ❌ Timer 强引用 self，invalidate 前不会释放
class ViewController: UIViewController {
    var timer: Timer?
    override func viewDidLoad() {
        timer = Timer.scheduledTimer(timeInterval: 1, target: self,
                                     selector: #selector(tick), userInfo: nil, repeats: true)
    }
    @objc func tick() {}
}

// ✅ 修复：使用 block API（iOS 10+）
timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
    self?.tick()
}
```

### 大量临时对象的内存控制

```objc
// ❌ 循环中大量临时对象堆积，内存峰值飙升
for (int i = 0; i < 100000; i++) {
    NSString *str = [NSString stringWithFormat:@"item_%d", i];
    // str 是 autorelease 对象，要等 RunLoop 休眠才释放
}

// ✅ 手动 @autoreleasepool，每轮循环及时释放
for (int i = 0; i < 100000; i++) {
    @autoreleasepool {
        NSString *str = [NSString stringWithFormat:@"item_%d", i];
    }
}
```

::: warning 子线程没有 RunLoop 自动管理
子线程默认没有 RunLoop，也就没有自动释放池。在子线程做大量操作时，务必手动加 `@autoreleasepool`。
:::

## 内存泄漏检测

循环引用不会崩溃，只会默默占着内存不放。检测手段从简到专：

### deinit 打印（最简单）

每个 ViewController 都加一行，pop/dismiss 后看控制台：

```swift
deinit {
    print("\(Self.self) deinit")
}
// 如果 pop 后没看到这行 → 泄漏了
```

### Xcode Memory Graph Debugger

在 App 运行中直接抓取内存快照，可视化查看引用链：

1. 运行 App 到疑似泄漏的页面
2. 点击 Xcode Debug 栏的 **⬡** 按钮，或 `Debug → Debug Memory Graph`
3. 左侧面板显示所有存活对象，**紫色感叹号 = 泄漏**
4. 点击对象查看完整引用链，直接看到循环引用的环

::: tip 推荐场景
不需要重新运行，随时截快照。适合开发过程中快速确认某个对象是否被释放。
:::

### Instruments - Leaks

系统级的泄漏检测工具：

1. `Product → Profile → Leaks` 模板
2. 运行 App，操作疑似泄漏的页面
3. Leaks 工具会标记检测到的泄漏对象
4. 点击泄漏对象查看引用链和调用栈

### Instruments - Allocations

排查内存持续增长（不一定是泄漏，可能是缓存未清理）：

1. `Product → Profile → Allocations` 模板
2. 用 **Mark Generation**（Heapshot Analysis）功能
3. 每次进入/退出页面前打一个 Mark
4. 对比两次 Mark 之间新增但未释放的对象，找出堆积的类型

### MLeaksFinder（第三方）

腾讯开源的自动检测工具，开发阶段无感知运行：

```ruby
# Podfile（仅 Debug 引入）
pod 'MLeaksFinder', :configurations => ['Debug']
```

原理：Hook `UIViewController` 的 pop/dismiss 方法，延迟 2 秒检查 VC 及其 View 树是否已释放，未释放则弹 Alert 警告。

### 检测工具对比

| 工具 | 侵入性 | 检测时机 | 适用场景 |
|------|--------|---------|---------|
| deinit 打印 | 需加代码 | 开发时 | 快速确认单个对象 |
| Memory Graph | 无 | 调试时随时 | 可视化引用链，定位环 |
| Instruments Leaks | 无 | Profile 模式 | 系统级泄漏检测 |
| Instruments Allocations | 无 | Profile 模式 | 内存增长趋势分析 |
| MLeaksFinder | Pod 集成 | 运行时自动 | 开发阶段自动发现 |

## 面试真题

### Q1: ARC 和 MRC 的区别？ARC 是运行时特性还是编译时特性？ ⭐

**答题思路**：

1. MRC 需要手动 `retain`/`release`，ARC 由编译器自动插入
2. ARC 是**编译时特性**，编译器在编译期分析对象生命周期并插入内存管理代码
3. 但 ARC 也依赖运行时支持（如 `weak` 的 Side Table、`autorelease` 优化）
4. ARC 下仍需手动处理循环引用

### Q2: weak 指针是怎么实现自动置 nil 的？ ⭐⭐

**答题思路**：

1. Runtime 维护一个全局的 Side Table（64 个，通过对象地址 hash 定位）
2. Side Table 中有 `weak_table`，存储`{对象地址: [所有 weak 指针地址]}` 的映射
3. 注册 `weak` 时，将指针地址加入对象的弱引用条目
4. 对象 `dealloc` 时，遍历弱引用条目，将所有 `weak` 指针置为 nil，然后移除条目
5. 加分：weak 变量访问时会调用 `objc_loadWeakRetained`，先 `retain` 再使用再 `release`，保证使用期间对象不被释放

### Q3: 引用计数存储在哪里？ ⭐⭐

**答题思路**：

1. 优化的 isa（非指针型 isa）：`extra_rc` 字段占 19 位，存储引用计数 - 1
2. 当 `extra_rc` 溢出时，`has_sidetable_rc` 置为 1，引用计数转存到 Side Table 的 `refcnts` 哈希表中
3. Tagged Pointer 不需要引用计数，`retain`/`release` 直接返回

### Q4: autorelease 对象什么时候释放？ ⭐⭐

**答题思路**：

1. 主线程：由 RunLoop 管理，在 `BeforeWaiting`（即将休眠）时 Pop 当前池并 Push 新池，期间所有 autorelease 对象被 release
2. 手动 `@autoreleasepool {}`：出了大括号就释放
3. 子线程：如果启动了 RunLoop 则同主线程；没有 RunLoop 则需要手动加 `@autoreleasepool`
4. 加分：底层是 `AutoreleasePoolPage` 双向链表，每页 4KB，Push 时插入 `POOL_BOUNDARY` 哨兵，Pop 时从哨兵开始逐个 release

### Q5: 如何检测和解决循环引用？ ⭐⭐⭐

**答题思路**：

1. **检测工具**：Xcode Memory Graph Debugger（查看对象引用关系图）、Instruments Leaks（运行时检测泄漏）、MLeaksFinder（第三方，退出页面自动检测）
2. **常见场景**：delegate 用 strong、闭包/block 捕获 self、Timer 强引用 target、NSNotificationCenter 的 block API
3. **解决方案**：delegate 用 `weak`、闭包用 `[weak self]` capture list、Timer 用 block API 或在 `deinit` 前 `invalidate`
4. 加分：提到 `unowned` 的使用场景——当你确定引用的对象生命周期一定比自己长时可以用 `unowned`，比 `weak` 少了 Optional 解包的开销

### Q6: 为什么 NSString 属性要用 copy 而不是 strong？ ⭐

**答题思路**：

1. 如果用 `strong`，外部传入一个 `NSMutableString`，内部属性和外部指向同一对象，外部修改会影响内部状态
2. `copy` 在赋值时调用 `copy` 方法，生成不可变副本，切断与外部的联系
3. 对于不可变对象（`NSString`），`copy` 实际是浅拷贝（返回自身），没有性能损失
4. 对于可变对象（`NSMutableString`），`copy` 是深拷贝，生成新的不可变对象
5. 加分：自定义对象支持 `copy` 需要实现 `NSCopying` 协议的 `copyWithZone:` 方法

### Q7: atomic 和 nonatomic 的区别？atomic 能保证线程安全吗？ ⭐

**答题思路**：

1. `atomic`（默认）在 getter/setter 内部加自旋锁，保证读写操作的原子性
2. `nonatomic` 不加锁，性能更好，iOS 开发中几乎都用 `nonatomic`
3. **`atomic` 不等于线程安全**：它只保证 getter/setter 的原子性，不保证业务逻辑安全
4. 例如 `self.array = @[]` 是安全的，但 `[self.array addObject:obj]` 不安全——getter 取出数组后，另一个线程可能同时修改
5. 真正的线程安全需要用 `@synchronized`、`NSLock`、GCD 串行队列等

### Q8: 对象的 dealloc 过程中做了什么？ ⭐⭐

**答题思路**：

1. 调用链：`dealloc` → `_objc_rootDealloc` → `object_dispose` → `objc_destructInstance` → `free`
2. `objc_destructInstance` 依次处理：C++ 析构函数（`has_cxx_dtor`）→ 移除关联对象（`has_assoc`）→ `clearDeallocating`
3. `clearDeallocating`：将所有 weak 指针置为 nil（`weakly_referenced`）→ 清理 Side Table 中的引用计数（`has_sidetable_rc`）
4. 最后 `free()` 归还堆内存
5. ARC 下 `dealloc` 不需要调用 `[super dealloc]`（编译器自动处理），只需要释放 ARC 管不到的资源（CF 对象、文件句柄等）

## 一张表回顾

| 概念 | 核心要点 |
|------|---------|
| ARC | 编译器自动插入 `retain`/`release`，不是 GC |
| 引用计数存储 | isa 的 `extra_rc`（19 位） → 溢出转 Side Table |
| copy 语义 | `NSString` 用 `copy` 防止可变版本被外部修改；容器 copy 只是单层深拷贝 |
| atomic vs nonatomic | `atomic` 只保证 getter/setter 原子性，不等于线程安全；iOS 几乎都用 `nonatomic` |
| `weak` | Side Table 弱引用表，对象释放时遍历置 nil |
| dealloc 调用链 | C++ 析构 → 移除关联对象 → weak 置 nil → 清理 Side Table → `free()` |
| `autorelease` | `AutoreleasePoolPage` 双向链表，RunLoop 驱动释放 |
| Tagged Pointer | 小对象直接编码在指针中，无需堆分配和引用计数 |
| 循环引用 | delegate 用 `weak`、闭包用 `[weak self]`、Timer 用 block API |
| 内存泄漏检测 | deinit 打印 → Memory Graph → Instruments Leaks → MLeaksFinder |
