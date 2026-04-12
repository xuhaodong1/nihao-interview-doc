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

## 弱引用实现

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

## 自动释放池

`@autoreleasepool` 实现延迟释放：对象调用 `autorelease` 后不会立即释放，而是等到池子 `drain` 时统一发送 `release`。

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

## 一张表回顾

| 概念 | 核心要点 |
|------|---------|
| ARC | 编译器自动插入 `retain`/`release`，不是 GC |
| 引用计数存储 | isa 的 `extra_rc`（19 位） → 溢出转 Side Table |
| `weak` | Side Table 弱引用表，对象释放时遍历置 nil |
| `autorelease` | `AutoreleasePoolPage` 双向链表，RunLoop 驱动释放 |
| Tagged Pointer | 小对象直接编码在指针中，无需堆分配和引用计数 |
| 循环引用 | delegate 用 `weak`、闭包用 `[weak self]`、Timer 用 block API |
