# 实战：加州房价预测

> 用一个完整的房价预测项目串联线性回归全流程——数据探索、标准化、模型对比、正则化、残差分析。

线性回归那篇文章讲了公式、梯度下降、正则化的原理，但光看公式不够——你需要亲手跑一遍才能真正理解"标准化到底改变了什么""Ridge 和 Lasso 的权重差在哪"。这个项目用加州房价数据集，从数据探索到模型评估完整走一遍，并通过可视化直观展示每一步的效果。

本文基于 scikit-learn + California Housing 数据集，对比线性回归、Ridge、Lasso 三种模型。

::: tip 项目源码
完整代码在项目的 `examples/linear-regression/` 目录下，可直接运行体验。
:::

## California Housing 数据集

California Housing 是 scikit-learn 内置的经典回归数据集，来自 1990 年美国人口普查。

| 属性 | 值 |
|------|------|
| 样本数量 | 20,640 个街区 |
| 特征数量 | 8 个 |
| 目标变量 | 房价中位数（单位：10 万美元） |
| 房价范围 | 0.15 ~ 5.00（即 1.5 万 ~ 50 万美元） |

8 个特征的含义：

| 特征 | 含义 | 值域示例 |
|------|------|---------|
| MedInc | 街区收入中位数 | 0.5 ~ 15.0 |
| HouseAge | 房屋年龄中位数 | 1 ~ 52 |
| AveRooms | 平均房间数 | 0.8 ~ 141.9 |
| AveBedrms | 平均卧室数 | 0.3 ~ 34.1 |
| Population | 街区人口 | 3 ~ 35,682 |
| AveOccup | 平均住户人数 | 0.7 ~ 1,243 |
| Latitude | 纬度 | 32.5 ~ 42.0 |
| Longitude | 经度 | -124.3 ~ -114.3 |

```python
from sklearn.datasets import fetch_california_housing

housing = fetch_california_housing()
X, y = housing.data, housing.target

print(X.shape)  # (20640, 8) — 20640 个街区，每个 8 个特征
print(y.shape)  # (20640,)   — 对应的房价中位数
```

注意特征的值域差异巨大：Population 最大 35,682，而 AveBedrms 最大才 34——这正是为什么线性回归**必须做标准化**。

## 数据预处理

### 划分数据集

```python
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
# 训练集 16512 条，测试集 4128 条
```

### 标准化

```python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)  # 训练集：fit + transform
X_test_scaled = scaler.transform(X_test)         # 测试集：只 transform
```

标准化公式：$x' = \frac{x - \mu}{\sigma}$

变换后每个特征的均值 ≈ 0，标准差 ≈ 1。

**为什么必须标准化？** 线性回归的权重 $w$ 直接乘以特征值。如果 Population 值域是 0~35000 而 AveBedrms 值域是 0~34，模型会被大数字的特征主导。标准化后权重才能真正反映特征的重要程度。

::: warning 标准化的正确姿势
```python
# ✅ 正确：训练集 fit_transform，测试集只 transform
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ❌ 错误：测试集也 fit_transform → 数据泄漏
X_test_scaled = scaler.fit_transform(X_test)
```
这和 MNIST 实战中一样——测试集必须用训练集的均值和标准差来变换。
:::

## 模型训练与对比

训练 5 个模型，对比普通线性回归和不同正则化强度的效果：

```python
from sklearn.linear_model import LinearRegression, Ridge, Lasso

models = {
    "线性回归": LinearRegression(),
    "Ridge (α=1.0)": Ridge(alpha=1.0),
    "Ridge (α=10)": Ridge(alpha=10.0),
    "Lasso (α=0.01)": Lasso(alpha=0.01),
    "Lasso (α=0.1)": Lasso(alpha=0.1),
}

for name, model in models.items():
    model.fit(X_train_scaled, y_train)
    y_pred = model.predict(X_test_scaled)
```

一行 `fit` 完成训练。线性回归内部用正规方程 $(X^TX)^{-1}X^Ty$ 直接算出最优权重，不需要迭代。

### 运行结果

| 模型 | MSE | MAE | R² |
|------|-----|-----|-----|
| 线性回归 | 0.5559 | 0.5332 | 0.5758 |
| Ridge (α=1.0) | 0.5559 | 0.5332 | 0.5758 |
| Ridge (α=10) | 0.5555 | 0.5331 | 0.5761 |
| **Lasso (α=0.01)** | **0.5483** | **0.5353** | **0.5816** |
| Lasso (α=0.1) | 0.6796 | 0.6222 | 0.4814 |

关键发现：
- **Lasso (α=0.01) 效果最好**，R² = 0.5816，轻微正则化反而比不加好
- Ridge 和普通线性回归差异很小——说明这个数据集没有严重的多重共线性
- **Lasso (α=0.1) 正则化太强**，R² 下降到 0.48，欠拟合了

## 特征权重分析

标准化后的回归系数直接反映特征的重要程度（值域统一了，系数大小才有可比性）。

| 特征 | 线性回归 | Ridge | Lasso (α=0.1) |
|------|---------|-------|--------------|
| **MedInc** | **0.8544** | **0.8543** | **0.7106** |
| HouseAge | 0.1225 | 0.1226 | 0.1065 |
| AveRooms | -0.2944 | -0.2942 | 0.0000 |
| AveBedrms | 0.3393 | 0.3390 | 0.0000 |
| Population | -0.0023 | -0.0023 | 0.0000 |
| AveOccup | -0.0408 | -0.0408 | 0.0000 |
| **Latitude** | **-0.8969** | **-0.8962** | -0.0115 |
| **Longitude** | **-0.8698** | **-0.8691** | 0.0000 |

几个重要发现：

1. **MedInc（收入中位数）是最强特征**，权重最大——收入越高的街区房价越贵，符合直觉
2. **Latitude 和 Longitude 影响很大**——地理位置是房价的关键因素（南加州 > 北加州）
3. **Lasso 把 5 个特征的权重压到了 0**，只保留了 MedInc、HouseAge、Latitude 三个最重要的特征——这就是 L1 正则化的**自动特征选择**能力
4. **Ridge 只缩小权重，不归零**——所有特征都保留

::: tip 权重的正负含义
- 正权重（如 MedInc = 0.85）：特征值越大，房价越高
- 负权重（如 Latitude = -0.90）：纬度越高（越北），房价越低
:::

## 模型评估

### R² 决定系数

$$R^2 = 1 - \frac{\sum (\hat{y}_i - y_i)^2}{\sum (\bar{y} - y_i)^2}$$

最佳模型 R² = 0.58，意味着模型解释了 58% 的房价变化。剩下的 42% 来自模型无法捕捉的因素（学区、装修、小区环境等——数据集中没有这些特征）。

### 残差分析

残差 = 真实值 - 预测值。一个好的模型，残差应该：
1. **均值接近 0**（无系统偏差）— 实际结果：0.003，通过
2. **呈正态分布**（误差随机）— 实际结果：大致对称，但有长尾
3. **与预测值无关**（方差齐性）— 实际结果：高价房区域残差偏大

```python
residuals = y_test - y_pred

print(f"残差均值: {residuals.mean():.4f}")   # 接近 0 → 无系统偏差
print(f"残差标准差: {residuals.std():.4f}")   # 越小越好
```

::: warning 残差揭示的问题
高价房（>4 万美元）的预测误差明显更大——这说明房价和特征之间的关系**不完全是线性的**。高价房的定价受更多非线性因素影响（稀缺性、豪宅溢价等），线性模型天然拟合不好这部分数据。想提升效果可以尝试多项式特征或树模型（如 XGBoost）。
:::

## 完整代码

::: details 点击展开完整代码

```python
import numpy as np
from sklearn.datasets import fetch_california_housing
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.metrics import mean_squared_error, r2_score

# 加载数据
housing = fetch_california_housing()
X, y = housing.data, housing.target

# 划分 + 标准化
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 训练三种模型
models = {
    "线性回归": LinearRegression(),
    "Ridge": Ridge(alpha=1.0),
    "Lasso": Lasso(alpha=0.01),
}

for name, model in models.items():
    model.fit(X_train_scaled, y_train)
    y_pred = model.predict(X_test_scaled)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"{name:8s} → MSE: {mse:.4f}  R²: {r2:.4f}")

# 查看特征权重
lr = models["线性回归"]
for name, w in zip(housing.feature_names, lr.coef_):
    print(f"  {name:12s}: {w:+.4f}")
```

:::

## 面试高频问题

### Q1: 线性回归的 R² 只有 0.58，说明什么？⭐⭐

**答题思路**：
1. R² = 0.58 意味着模型解释了 58% 的房价变化
2. 剩余 42% 来自数据集中没有的特征（学区、装修等）和非线性关系
3. 不代表模型"差"——线性模型的上限取决于数据本身的线性程度
4. 加分：可以用多项式特征或非线性模型提升，但 R² 不是越高越好（可能过拟合）

### Q2: 标准化后的权重为什么能反映特征重要性？⭐⭐

**答题思路**：
1. 标准化前，权重受特征值域影响——Population 范围 0~35000，权重自然很小
2. 标准化后所有特征在同一尺度（均值 0，标准差 1），权重的绝对值才有可比性
3. 权重越大，该特征对预测值的影响越大
4. 加分：这也是为什么 Lasso 能做特征选择——权重为 0 的特征可以直接丢弃

### Q3: Ridge 和 Lasso 在这个任务中表现有什么不同？⭐⭐⭐

**答题思路**：
1. Ridge 将所有权重缩小但不归零——8 个特征都保留
2. Lasso 将 5 个不重要特征的权重压到 0——自动筛选出 MedInc、HouseAge、Latitude
3. 在这个数据集上 Lasso (α=0.01) 效果最好，说明部分特征确实是噪声
4. 加分：α 太大（如 0.1）会导致欠拟合，需要通过交叉验证找合适的值

### Q4: 残差分析能告诉我们什么？⭐⭐

**答题思路**：
1. 残差均值接近 0 → 模型没有系统性偏差
2. 残差呈正态分布 → 误差是随机的，符合线性回归假设
3. 残差与预测值无关 → 方差齐性，不同价位的预测精度一致
4. 如果残差有明显模式（如高价房残差偏大），说明数据关系不完全是线性的

### Q5: 如何提升这个模型的效果？⭐

**答题思路**：
1. 加入更多特征（学区评分、到市中心距离等）
2. 用多项式特征捕捉非线性关系
3. 尝试非线性模型（决策树、XGBoost）
4. 做特征交叉（如收入 × 地理位置的交互项）

## 一张表回顾

| 知识点 | 核心要义 | 掌握程度 |
|--------|---------|---------|
| California Housing | 20640 个街区、8 个特征的回归数据集 | ⭐⭐ 理解 |
| 数据标准化 | 统一特征尺度，权重才有可比性 | ⭐⭐⭐ 必须 |
| 数据泄漏 | 测试集不能 fit，只能用训练集统计量 transform | ⭐⭐⭐ 必须 |
| 线性回归 vs Ridge vs Lasso | 无正则化 vs L2 缩小权重 vs L1 权重归零 | ⭐⭐⭐ 必须 |
| 特征权重分析 | 标准化后系数绝对值 = 特征重要性 | ⭐⭐ 理解 |
| R² 决定系数 | 模型解释了多少比例的变化，0~1 越大越好 | ⭐⭐ 理解 |
| 残差分析 | 均值近 0、正态分布、与预测值无关 | ⭐⭐ 理解 |
| Lasso 特征选择 | α 控制正则化强度，过大会欠拟合 | ⭐⭐ 理解 |
