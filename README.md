# 坐标关系与计算方法（Canvas 与 labelRect）

本文说明 `clientX/clientY`、`canvas.width/height`、`labelRect.left/top/width/height` 之间的关系与换算方法，覆盖从鼠标点位到画布世界坐标，再到 `labelRect` 内部坐标的完整链路。

## 1. 坐标系定义

1. 浏览器视口坐标（Mouse Event）
- `clientX/clientY`：相对浏览器视口左上角的坐标。

2. 画布可视坐标（Canvas DOM）
- `canvasX/canvasY`：相对 canvas 元素左上角的坐标。
- 需要先获取 `canvasRect = canvasEl.getBoundingClientRect()`。

3. Fabric 世界坐标（Object Space）
- 图元（如 `Rect/Textbox`）的 `left/top` 所在坐标系。
- 受视口变换影响，常见矩阵：`[zoom, 0, 0, zoom, panX, panY]`。

4. `labelRect` 局部坐标（Label Local Space）
- 以 `labelRect.left/top` 作为局部原点。
- 用于表达“标签内部位置”。

## 2. 核心换算公式

### 2.1 视口坐标 -> 画布可视坐标

```ts
canvasX = clientX - canvasRect.left
canvasY = clientY - canvasRect.top
```

### 2.2 画布可视坐标 -> Fabric 世界坐标

```ts
worldX = (canvasX - panX) / zoom
worldY = (canvasY - panY) / zoom
```

说明：
- `zoom` 为当前缩放比例（`canvas.getZoom()`）。
- `panX/panY` 为视口平移（`viewportTransform[4]` / `viewportTransform[5]`）。

### 2.3 世界坐标 -> labelRect 局部坐标

```ts
localX = worldX - labelRect.left
localY = worldY - labelRect.top
```

## 3. 尺寸关系

标签尺寸由物理尺寸和 DPI 决定：

```ts
labelRect.width = labelWidth(inch) * dpi
labelRect.height = labelHeight(inch) * dpi
```

常见自动缩放计算：

```ts
zoomX = canvas.width / labelRect.width
zoomY = canvas.height / labelRect.height
zoom = min(zoomX, zoomY) * paddingFactor
```

其中 `paddingFactor` 一般小于 `1`（例如 `0.7`），用于留出边距。

## 4. 命中判断（点是否在标签内）

```ts
left <= worldX <= left + width
top <= worldY <= top + height
```

等价写法：

```ts
labelRect.left <= worldX && worldX <= labelRect.left + labelRect.width
labelRect.top <= worldY && worldY <= labelRect.top + labelRect.height
```

## 5. 固定原点说明（当前目标）

当坐标系统一为 `labelRect` 左上角原点时：

```ts
labelRect.left = 0
labelRect.top = 0
```

则：

```ts
localX = worldX
localY = worldY
```

这意味着画布中的世界坐标可以直接视为标签内坐标。

## 6. 可验证数值示例

假设：
- `canvasRect.left = 100`
- `canvasRect.top = 60`
- 鼠标事件：`clientX = 460`, `clientY = 300`
- `zoom = 2`
- `panX = -40`, `panY = 20`
- `labelRect.left = 0`, `labelRect.top = 0`

步骤 1：转画布可视坐标

```ts
canvasX = 460 - 100 = 360
canvasY = 300 - 60 = 240
```

步骤 2：转世界坐标

```ts
worldX = (360 - (-40)) / 2 = 200
worldY = (240 - 20) / 2 = 110
```

步骤 3：转 labelRect 局部坐标

```ts
localX = 200 - 0 = 200
localY = 110 - 0 = 110
```

结论：该鼠标点对应标签内坐标 `(200, 110)`。

## 7. 测试与验收清单

1. 文档检查
- Markdown 语法正确。
- 公式表达无歧义。
- 术语一致：视口坐标 / 画布可视坐标 / 世界坐标 / 局部坐标。

2. 逻辑检查
- 使用示例参数能完整走通 `client -> canvas -> world -> local`。
- 结果数值前后一致、可复算。

3. 可用性检查
- 开发者可直接按公式实现“鼠标点转 labelRect 坐标”。
- 无需额外推断坐标系含义与变换顺序。

## 8. 默认假设

- 文档语言：中文。
- Fabric 视口矩阵采用常见形式：`[zoom, 0, 0, zoom, panX, panY]`。
- 内容写在顶层 `README.md`，不拆分到其他文件。
