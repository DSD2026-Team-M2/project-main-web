# M2 临床网页端

面向医生与康复治疗师的康复数据工作站（非患者端）。技术栈：**React 19**、**TypeScript**、**Vite**、**ECharts**、**Three.js**（**@react-three/fiber** + **drei**）。

## 快速开始

```bash
cd m2-clinical-web
npm install
npm run dev
```

浏览器打开控制台提示的本地地址（默认 `http://localhost:5173`）。路由使用 **Hash 模式**（`#/p/患者ID/页面`），便于静态部署。

- `npm run build`：生产构建  
- `npm run preview`：预览构建结果  

## 功能概览

| 模块 | 说明 |
|------|------|
| **长期恢复趋势** | 多指标时间序列；周/月/全部筛选；手术/评估等**事件竖线**；实测与 AI 推断分系列展示；异常点标记与 tooltip 说明 |
| **历史与对比** | 训练/评估列表；多选记录后表格对比，**Δ 与改善/退步**方向 |
| **3D 肢体重建** | 轨道控制旋转/缩放/平移；分段**热力颜色**与角度示意；切换患者或刷新会重建 Canvas 以利于释放 GPU |
| **REST 对接** | 当前为 **Mock**（`src/services/clinicalApi.ts` 中 `USE_MOCK`）；类型定义见 `src/types/clinical.ts` |

## 目录结构

```
src/
  components/     # 布局、图表、3D、通用 UI
  context/        # 当前患者等全局状态
  pages/          # 各功能页
  services/       # API 与 mock
  types/          # 领域类型
```

## 对接真实后端

1. 在 `src/services/clinicalApi.ts` 将 `USE_MOCK` 设为 `false`（或改为环境变量）。  
2. 实现与现有方法签名一致的 `fetch` 调用，建议基地址来自 `import.meta.env.VITE_API_BASE`。  
3. 响应 JSON 建议包含字段：`source: "measured" | "ai_inferred"`，趋势点可选 `isAnomaly`、`anomalyNote`。

## 临床备注与视图分享

- **备注**：按患者保存在浏览器 `localStorage`，非正式病历。  
- **分享**：顶栏「复制当前视图链接」复制完整 URL（含 Hash），便于同事打开同一视图。

## 性能说明

- 图表使用 **LTTB 抽样**（`sampling: 'lttb'`）与 **dataZoom**，适合较长序列。  
- 3D 页通过 **`key` 重建 Canvas**、卸载时 `THREE.Cache.clear()`，降低长时间驻留的内存占用；后续可改为单 Canvas + 仅更新材质/几何。

## 许可

示例项目，按实际需要补充许可证与合规说明（含患者数据与医疗器械相关法规）。
