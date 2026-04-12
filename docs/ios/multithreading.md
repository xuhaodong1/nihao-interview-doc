# 多线程与 GCD

> iOS 并发编程的核心武器——理解队列、线程池和锁，写出高性能且线程安全的代码。

想象一个餐厅：只有一个窗口（单线程）时，顾客必须排队，一个一个来；开多个窗口（多线程）后，多个顾客可以同时点餐。GCD 就是这个餐厅的**调度系统**——你只需要把"菜单"（任务）丢给它，它自动决定开几个窗口、派哪个厨师来做。

## 多线程方案总览

iOS 提供四种多线程方案，从底层到上层：

| 方案 | 语言 | 线程管理 | 使用频率 | 类比 |
|------|------|---------|---------|------|
| **pthread** | C | 手动创建/销毁 | 几乎不用 | 自己盖餐厅、雇人、排班 |
| **NSThread** | ObjC | 手动管理 | 偶尔使用 | 直接雇一个厨师，告诉他做什么 |
| **GCD** | C | 系统自动管理 | 最常用 | 外卖平台——你下单，平台派骑手 |
| **NSOperation** | ObjC | 系统自动管理 | 常用 | 项目经理——可以设置任务依赖、取消任务 |

::: tip 面试结论
日常开发首选 GCD（简单任务）和 NSOperation（复杂任务依赖）。pthread 和 NSThread 基本不直接使用。
:::

## GCD 核心概念

GCD（Grand Central Dispatch）基于两个核心概念：**队列**和**任务**。

![GCD 队列类型对比](/images/gcd-queue-types.png)

### 队列（Queue）

队列决定任务的**执行顺序**：

| 队列类型 | 特点 | 获取方式 |
|---------|------|---------|
| **串行队列** | 任务一个接一个执行，FIFO | `dispatch_queue_create("name", DISPATCH_QUEUE_SERIAL)` |
| **并发队列** | 多个任务可以同时执行 | `dispatch_queue_create("name", DISPATCH_QUEUE_CONCURRENT)` |
| **主队列** | 特殊的串行队列，任务在主线程执行 | `dispatch_get_main_queue()` |
| **全局队列** | 系统提供的并发队列，有优先级 | `dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0)` |

### 任务（sync vs async）

任务的执行方式决定**是否阻塞当前线程**：

| 执行方式 | 是否阻塞 | 是否开新线程 |
|---------|---------|------------|
| **sync（同步）** | 阻塞当前线程，等任务完成才返回 | 不开新线程 |
| **async（异步）** | 不阻塞，立即返回 | 可能开新线程 |

### 队列 + 执行方式组合

这张表是面试必考，6 种组合的行为要烂熟于心：

|  | 并发队列 | 串行队列 | 主队列 |
|--|---------|---------|-------|
| **sync** | 不开新线程，串行执行 | 不开新线程，串行执行 | **死锁**（在主线程调用时） |
| **async** | 开新线程，并发执行 | 开一条新线程，串行执行 | 不开新线程，串行执行 |

```objc
// 最常用的组合：async + 全局并发队列（子线程执行耗时任务）
dispatch_async(dispatch_get_global_queue(0, 0), ^{
    // 子线程：耗时操作（网络请求、图片处理）
    NSData *data = [NSData dataWithContentsOfURL:url];
    
    // 回主线程更新 UI
    dispatch_async(dispatch_get_main_queue(), ^{
        self.imageView.image = [UIImage imageWithData:data];
    });
});
```

::: danger 主队列 + sync = 死锁
在主线程调用 `dispatch_sync(dispatch_get_main_queue(), ^{...})` 会死锁。sync 等待 block 执行完，block 排在主队列末尾等主线程空闲，互相等待。
:::

## GCD 常用 API

### dispatch_after（延迟执行）

```objc
dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2 * NSEC_PER_SEC)),
               dispatch_get_main_queue(), ^{
    // 2 秒后在主线程执行
});
```

::: warning 注意
`dispatch_after` 是延迟**提交**任务到队列，不是延迟**执行**。如果队列繁忙，实际执行时间会晚于指定时间。
:::

### dispatch_once（一次性执行）

```objc
// 线程安全的单例实现
+ (instancetype)sharedInstance {
    static MyClass *instance;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[MyClass alloc] init];
    });
    return instance;
}
```

底层通过原子操作实现，保证 block 在整个应用生命周期只执行一次，且线程安全。

### dispatch_group（任务组）

等待多个异步任务全部完成后再执行下一步：

```objc
dispatch_group_t group = dispatch_group_create();
dispatch_queue_t queue = dispatch_get_global_queue(0, 0);

dispatch_group_async(group, queue, ^{
    // 任务 1：下载图片 A
});

dispatch_group_async(group, queue, ^{
    // 任务 2：下载图片 B
});

// 所有任务完成后回主线程
dispatch_group_notify(group, dispatch_get_main_queue(), ^{
    NSLog(@"图片 A 和 B 都下载完了，刷新 UI");
});
```

对于不使用 `dispatch_group_async` 的场景（如网络请求自带回调），用 `enter`/`leave` 手动配对：

```objc
dispatch_group_enter(group);
[network requestWithCompletion:^{
    // 请求完成
    dispatch_group_leave(group);
}];
```

### dispatch_barrier（栅栏）

在并发队列中插入一个"栅栏"：等前面的任务都执行完，独占执行栅栏任务，完成后再继续后续任务。

![dispatch_barrier 读写分离](/images/gcd-barrier.png)

```objc
dispatch_queue_t queue = dispatch_queue_create("com.app.rw", DISPATCH_QUEUE_CONCURRENT);

// 读操作 —— 并发执行
- (NSString *)readData {
    __block NSString *result;
    dispatch_sync(queue, ^{
        result = self.sharedData;
    });
    return result;
}

// 写操作 —— barrier 独占执行
- (void)writeData:(NSString *)data {
    dispatch_barrier_async(queue, ^{
        self.sharedData = data;
    });
}
```

::: warning barrier 只对自定义并发队列有效
`dispatch_barrier_async` 必须使用 `dispatch_queue_create` 创建的并发队列。如果传全局队列 `dispatch_get_global_queue`，barrier 会退化为普通 `dispatch_async`，失去栅栏效果。
:::

### dispatch_semaphore（信号量）

信号量 = 一个计数器，控制同时访问资源的线程数：

```objc
// 创建信号量，初始值 = 最大并发数
dispatch_semaphore_t sema = dispatch_semaphore_create(3);

for (int i = 0; i < 100; i++) {
    dispatch_semaphore_wait(sema, DISPATCH_TIME_FOREVER);  // 计数 -1，为 0 时阻塞
    dispatch_async(dispatch_get_global_queue(0, 0), ^{
        // 同时最多 3 个任务执行
        [self downloadFile:i];
        dispatch_semaphore_signal(sema);  // 计数 +1，唤醒等待线程
    });
}
```

信号量的三种用法：

| 初始值 | 用途 | 场景 |
|-------|------|------|
| 0 | 等待异步事件 | 异步转同步 |
| 1 | 互斥锁 | 保护临界区 |
| N | 控制并发数 | 限制同时下载数 |

### dispatch_apply（并行循环）

```objc
// 并行执行 10 次，自动等待全部完成
dispatch_apply(10, dispatch_get_global_queue(0, 0), ^(size_t index) {
    NSLog(@"Processing item %zu", index);
});
NSLog(@"所有任务完成");  // dispatch_apply 是同步的，会等待
```

## GCD 底层原理

### libdispatch 与 Width

![GCD 调度流程](/images/gcd-dispatch-flow.png)

GCD 基于 Apple 开源的 libdispatch 库实现。核心概念是 **Width（宽度）**——队列能同时执行的任务数：

```cpp
// 队列创建时设置 width（queue.c）
_dispatch_queue_init(dq, dqf, dqai.dqai_concurrent ?
        DISPATCH_QUEUE_WIDTH_MAX : 1, ...);
// 串行队列：width = 1（一次只执行 1 个任务）
// 并发队列：width = 4094（DISPATCH_QUEUE_WIDTH_MAX）
```

调度流程：

1. 任务提交到队列时，检查当前 width 是否有剩余
2. 有 → 消耗一个 width 槽位，将任务推送到线程池执行
3. 没有 → 任务在队列中等待
4. 任务完成 → 归还 width 槽位，唤醒等待的任务

### 线程池与线程上限

| 层级 | 限制 | 说明 |
|------|------|------|
| 队列 Width | 串行 1 / 并发 4094 | 逻辑并发度 |
| Non-overcommit | CPU 核心数 | 全局队列默认 |
| XNU 内核 | 64 个线程 | 整个进程的硬上限 |

**Overcommit**：串行队列默认开启 overcommit，允许超出 CPU 核心数创建线程。这是为了避免串行队列因线程不足而死锁，但也可能导致**线程爆炸**。

::: tip 面试加分
GCD 的队列不是线程。队列是任务的排列方式，线程是执行任务的工人。GCD 维护一个线程池，根据队列类型和系统负载从池中取线程来执行任务。
:::

## NSOperation

NSOperation 是对 GCD 的面向对象封装，提供了 GCD 不具备的高级功能。

### 基本使用

```objc
// 1. 创建操作
NSBlockOperation *op1 = [NSBlockOperation blockOperationWithBlock:^{
    NSLog(@"任务 1");
}];

NSBlockOperation *op2 = [NSBlockOperation blockOperationWithBlock:^{
    NSLog(@"任务 2");
}];

// 2. 设置依赖：op2 等 op1 完成后再执行
[op2 addDependency:op1];

// 3. 创建队列并添加
NSOperationQueue *queue = [[NSOperationQueue alloc] init];
queue.maxConcurrentOperationCount = 3;  // 最多 3 个任务并发
[queue addOperations:@[op1, op2] waitUntilFinished:NO];

// 4. 完成回调
op2.completionBlock = ^{
    NSLog(@"任务 2 完成");
};

// 5. 取消
[queue cancelAllOperations];
```

### 自定义 NSOperation

```objc
@interface DownloadOperation : NSOperation
@property (nonatomic, strong) NSURL *url;
@end

@implementation DownloadOperation

- (void)main {
    if (self.isCancelled) return;
    
    NSData *data = [NSData dataWithContentsOfURL:self.url];
    if (self.isCancelled) return;  // 耗时操作后再检查一次
    
    // 处理数据...
}

@end
```

### GCD vs NSOperation

| 特性 | GCD | NSOperation |
|------|-----|-------------|
| API 层级 | C 函数 | ObjC 对象 |
| 依赖关系 | 需手动实现（group/barrier） | `addDependency:` 原生支持 |
| 取消任务 | 不支持 | `cancel` + `isCancelled` |
| 最大并发数 | 不直接支持 | `maxConcurrentOperationCount` |
| 任务状态 KVO | 不支持 | isReady/isExecuting/isFinished |
| 适用场景 | 简单异步任务、一次性操作 | 复杂任务流（如 SDWebImage 下载） |

::: tip 如何选择
简单的异步操作（切线程、延迟执行）→ GCD。需要依赖管理、取消、优先级的复杂任务 → NSOperation。
:::

## 线程安全

多线程访问同一块资源（如属性、数组、字典）时，需要保护临界区。

### 锁的分类与对比

| 锁 | 类型 | 性能 | 特点 |
|----|------|------|------|
| `os_unfair_lock` | 互斥锁 | 最快 | 不公平，自动处理优先级反转 |
| `dispatch_semaphore` | 信号量 | 快 | 可控制并发数 |
| `pthread_mutex` | 互斥锁 | 较快 | POSIX 标准，通用 |
| `NSLock` | 互斥锁 | 中等 | ObjC 封装 |
| `NSCondition` | 条件锁 | 中等 | 可等待条件满足 |
| `NSRecursiveLock` | 递归锁 | 较慢 | 同一线程可重复加锁 |
| `@synchronized` | 递归锁 | 最慢 | 语法最简单 |

```objc
// 推荐：os_unfair_lock（性能最好）
#import <os/lock.h>
os_unfair_lock lock = OS_UNFAIR_LOCK_INIT;
os_unfair_lock_lock(&lock);
// 临界区
os_unfair_lock_unlock(&lock);

// 简单场景：@synchronized（最省事）
@synchronized(self) {
    // 临界区
}

// 控制并发数：dispatch_semaphore
dispatch_semaphore_t sema = dispatch_semaphore_create(1);  // 初始值 1 = 互斥锁
dispatch_semaphore_wait(sema, DISPATCH_TIME_FOREVER);
// 临界区
dispatch_semaphore_signal(sema);
```

### GCD 实现线程安全

```objc
// 方案 1：串行队列（所有读写操作串行化）
dispatch_queue_t queue = dispatch_queue_create("com.app.safe", DISPATCH_QUEUE_SERIAL);
dispatch_sync(queue, ^{
    // 线程安全的读写操作
});

// 方案 2：Barrier 读写分离（读多写少场景，性能更优）
dispatch_queue_t rwQueue = dispatch_queue_create("com.app.rw", DISPATCH_QUEUE_CONCURRENT);

// 读 —— 并发，互不阻塞
dispatch_sync(rwQueue, ^{
    return self.data;
});

// 写 —— 独占，等读完再写
dispatch_barrier_async(rwQueue, ^{
    self.data = newValue;
});
```

### 死锁

![GCD 死锁示意](/images/gcd-deadlock.png)

死锁 = 两个或多个线程互相等待，谁都无法继续。

```objc
// 死锁 1：主线程 sync 主队列
// 当前在主线程执行 → sync 等 block 完成 → block 在主队列排队等主线程空闲 → 互等
dispatch_sync(dispatch_get_main_queue(), ^{
    NSLog(@"永远不会执行");
});

// 死锁 2：串行队列嵌套 sync
dispatch_queue_t queue = dispatch_queue_create("serial", DISPATCH_QUEUE_SERIAL);
dispatch_sync(queue, ^{
    // 正在执行，占住了队列
    dispatch_sync(queue, ^{
        // 等待队列空闲，但外层 sync 还没结束 → 死锁
        NSLog(@"永远不会执行");
    });
});
```

**死锁条件**：在串行队列（包括主队列）的任务中，对**同一个队列** sync 提交新任务。并发队列不会死锁，因为 width > 1 可以同时执行多个任务。

### 线程爆炸

向全局队列提交大量任务时，GCD 可能创建过多线程（最多 64 个），导致上下文切换开销剧增：

```objc
// ❌ 可能线程爆炸
for (int i = 0; i < 10000; i++) {
    dispatch_async(dispatch_get_global_queue(0, 0), ^{
        [self processItem:i];  // 如果每个任务都比较耗时，会创建大量线程
    });
}

// ✅ 用信号量限制并发数
dispatch_semaphore_t sema = dispatch_semaphore_create(10);  // 最多 10 个并发
for (int i = 0; i < 10000; i++) {
    dispatch_semaphore_wait(sema, DISPATCH_TIME_FOREVER);
    dispatch_async(dispatch_get_global_queue(0, 0), ^{
        [self processItem:i];
        dispatch_semaphore_signal(sema);
    });
}
```

### 优先级反转

低优先级线程持有锁 → 高优先级线程等待锁 → 中优先级线程抢占 CPU 运行 → 低优先级线程拿不到 CPU 无法释放锁 → 高优先级线程一直等。

| 解决方案 | 原理 |
|---------|------|
| `os_unfair_lock` | 内核自动提升持锁线程优先级（优先级继承） |
| QoS 传播 | GCD 自动传播 Quality of Service |
| 避免用 `OSSpinLock` | 已废弃，不处理优先级反转 |

## Swift Concurrency

Swift 5.5+ 引入了现代并发模型，从回调地狱走向结构化并发：

### async/await

```swift
// 异步函数
func fetchUser() async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}

// 调用
Task {
    let user = try await fetchUser()
    // 直接用，不需要回调嵌套
}
```

### Actor

Actor 自动保证内部状态的线程安全，无需手动加锁：

```swift
actor Counter {
    private var value = 0
    
    func increment() { value += 1 }
    func getValue() -> Int { return value }
}

let counter = Counter()
await counter.increment()  // 自动串行化访问
```

### TaskGroup

```swift
// 并发执行多个任务，等待全部完成
func fetchAllUsers() async throws -> [User] {
    try await withThrowingTaskGroup(of: User.self) { group in
        for id in userIDs {
            group.addTask { try await fetchUser(id: id) }
        }
        return try await group.reduce(into: []) { $0.append($1) }
    }
}
```

::: tip GCD vs Swift Concurrency
Swift Concurrency 是 GCD 的上层抽象，底层仍然依赖 libdispatch。新项目优先用 async/await + Actor，老项目中 GCD 和 Swift Concurrency 可以共存。
:::

## 面试真题

### Q1: GCD 的队列和线程是什么关系？ ⭐

**答题思路**：

1. 队列是任务的排列方式（串行/并发），线程是执行任务的工人
2. GCD 维护一个线程池，根据队列类型和系统负载分配线程
3. 串行队列的任务不一定在同一个线程执行，只是保证顺序
4. 并发队列的多个任务可能在多个线程上并行执行
5. 主队列的任务固定在主线程执行

### Q2: sync 和 async 的区别？在主队列 sync 会怎样？ ⭐

**答题思路**：

1. sync 阻塞当前线程直到任务完成，async 不阻塞
2. sync 不会开新线程，async 会（取决于队列类型）
3. 在主线程调用 `dispatch_sync(mainQueue, block)` 会**死锁**
4. 原因：sync 等 block 完成 → block 排在主队列末尾等主线程空闲 → 互相等待

### Q3: dispatch_barrier 的作用和使用条件？ ⭐⭐

**答题思路**：

1. barrier 在并发队列中充当"栅栏"：等前面的任务完成 → 独占执行 → 再执行后续任务
2. 典型用途：读写锁（读操作 sync，写操作 barrier_async）
3. **必须用自定义并发队列**，全局队列无效（因为全局队列被系统共享）
4. 加分：barrier_sync vs barrier_async 的区别（是否阻塞提交线程）

### Q4: 如何用 GCD 实现读写锁？ ⭐⭐

**答题思路**：

1. 创建自定义并发队列
2. 读操作用 `dispatch_sync` 提交到并发队列 → 多个读可以并行
3. 写操作用 `dispatch_barrier_async` 提交 → 写时独占，等所有读完成
4. 比 `pthread_rwlock` 代码更简洁，且自动管理线程
5. 加分：提到这是 GCD barrier 的经典应用场景

### Q5: iOS 中有哪些锁？性能排序？ ⭐⭐

**答题思路**：

1. 性能从高到低：`os_unfair_lock` > `dispatch_semaphore` > `pthread_mutex` > `NSLock` > `NSRecursiveLock` > `@synchronized`
2. `os_unfair_lock`：推荐，处理优先级反转
3. `OSSpinLock`：已废弃，不处理优先级反转
4. `@synchronized`：性能最差但语法最简，底层也是 `pthread_mutex`
5. 选择原则：性能敏感 → `os_unfair_lock`，需要递归 → `NSRecursiveLock`，Swift → `Actor`

### Q6: 什么是死锁？举例说明 GCD 中的死锁场景 ⭐⭐⭐

**答题思路**：

1. 死锁 = 两个或多个线程互相等待，谁都无法继续
2. GCD 经典死锁：主线程 sync 主队列、串行队列嵌套 sync
3. 根本原因：在串行队列的任务中，对同一个串行队列 sync 提交新任务
4. 并发队列不会出现这种死锁（width > 1）
5. 加分：如何避免——不要在串行队列中嵌套 sync 同一队列，用 async 替代

### Q7: GCD vs NSOperation 如何选择？ ⭐

**答题思路**：

1. GCD：轻量级 C API，适合简单异步任务（切线程、延迟、一次性执行）
2. NSOperation：ObjC 封装，支持依赖、取消、KVO、最大并发数
3. 需要任务依赖 → NSOperation；简单异步 → GCD
4. 实际例子：SDWebImage 用 NSOperation 管理下载队列（可取消、有优先级）
5. Swift 新项目 → 优先考虑 async/await + Actor

### Q8: 如何避免线程爆炸？ ⭐⭐

**答题思路**：

1. 线程爆炸：向全局队列提交大量耗时任务，GCD 创建过多线程（上限 64）
2. 方案 1：用 `dispatch_semaphore` 限制并发数
3. 方案 2：用 `NSOperationQueue.maxConcurrentOperationCount` 限制
4. 方案 3：用串行队列替代并发队列（牺牲并行度换稳定性）
5. 加分：提到 XNU 内核 64 线程上限，overcommit 机制

## 一张表回顾

| 概念 | 核心要点 |
|------|---------|
| 四种方案 | pthread → NSThread → GCD → NSOperation，日常用后两者 |
| 队列 vs 线程 | 队列是任务排列方式，线程是执行者；GCD 通过线程池调度 |
| sync vs async | sync 阻塞当前线程，async 不阻塞；sync 不开新线程 |
| dispatch_group | 等待多个异步任务完成，`notify` 或 `enter`/`leave` |
| dispatch_barrier | 并发队列中的"栅栏"，读写分离；必须用自定义并发队列 |
| dispatch_semaphore | 计数器控制并发；初始值 0=等待，1=互斥锁，N=限流 |
| libdispatch Width | 串行 width=1，并发 width=4094，线程池上限 64 |
| NSOperation | 比 GCD 多了依赖、取消、KVO、最大并发数 |
| 锁 | `os_unfair_lock` 最快，`@synchronized` 最简单最慢 |
| 死锁 | 串行队列嵌套 sync 同一队列；并发队列不会 |
| 线程爆炸 | 信号量/NSOperation 限制并发数 |
| Swift Concurrency | async/await + Actor，底层仍依赖 libdispatch |
