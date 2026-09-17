---
created: 2026-09-17
tags:
  - vite
  - pnpm
  - build
  - tech-debt
  - upgrade-plan
---

# Vite 锁定在 4.1.1 的原因，以及后续升级到 Vite 5 的计划

## 现状

`pnpm-workspace.yaml` 里有一条 override，把整个 workspace 的 vite 钉死在 4.1.1：

```yaml
overrides:
  vite: 4.1.1
```

这是 2026-09-17 从 npm 迁移到 pnpm 时加的（commit `ef80136`）。`package.json` 里声明的仍然是 `"vite": "^4.1.1"`，没有 override 的话会解析到 4.5.14。

## 为什么必须锁

迁移时删掉 `package-lock.json` 重建依赖树，vite 从 4.1.1 漂到 4.5.14，构建直接失败：

```
ERROR: [plugin: externalize-deps] "@iconify/json/json/mdi.json" resolved to an ESM file.
ESM file cannot be loaded by `require`.
```

完整因果链：

1. `vite.config.js` 是 CJS（项目 `package.json` 没有 `"type": "module"`，且 config 里用了 `require(dataFilename)` 和 `__dirname`），所以 vite 用 esbuild 把 config 打成 CJS 再加载。
2. config 顶部 `import { getRenderData } from './jsoncv/src/themes/data'`，这条链会走到 `jsoncv/src/lib/icons.js:1`：
   `import * as mdiJSON from '@iconify/json/json/mdi.json'`。
3. `@iconify/json` 的 `package.json` 带 `"type": "module"`（**所有** 2.2.x 版本都带，包括迁移前用的 2.2.19，所以锁 iconify 的版本没用）。
4. vite ≥ 4.3 的 `externalize-deps` 插件会在打包 CJS config 时静态检查被 external 化的包是不是 ESM，是就直接报错——**不管 Node 版本是否支持 `require(esm)`**。Node 22+ 其实已经支持了，是 vite 这边的检查太早、太死。

所以问题跟 pnpm 无关，纯粹是 vite 版本漂移暴露出来的。锁回 4.1.1 是当时代价最小的选择（不碰 submodule、构建产物与迁移前一致：`dist/index.html` 28.93 kB）。

另外 `pnpm import`（从旧 `package-lock.json` 继承版本）在这里走不通：旧 lock 把 jsoncv 记成 `file:jsoncv` 包，映射不到 pnpm workspace importer，版本照样漂。

## TODO：有空时升级到 Vite 5，把下面这些一起解决掉

- [ ] **把 `vite.config.js` 改成 ESM**
  - `const data = require(dataFilename)` → `JSON.parse(readFileSync(...))` 或 `createRequire(import.meta.url)`
  - `__dirname` → `path.dirname(fileURLToPath(import.meta.url))`
  - config 变成 ESM 后，esbuild 输出 ESM，external 的 ESM 包就不再触发上面那个检查
- [ ] **改 jsoncv 里的 JSON import**（在 [jsoncv](https://github.com/reorx/jsoncv) 仓库改，本仓库只是 submodule）
  - config 走 ESM 之后，`jsoncv/src/lib/icons.js:1` 的 `import * as mdiJSON from '@iconify/json/json/mdi.json'` 在 Node ESM 下需要 import attributes：`with { type: 'json' }`（Node 22+ 强制要求）
  - 这是升级链条里唯一需要跨仓库的改动，也是主要阻塞点
- [ ] **升级相关插件**
  - `vite-plugin-ejs` 1.8 的 peer 已经要求 `vite>=5`，现在每次 `pnpm install` 都会打 peer warning，升级后自然消失
  - `vite-plugin-singlefile`（当前 0.13.5，最新 2.x）、`@iconify/utils` 等一并看一下
- [ ] **移除 `pnpm-workspace.yaml` 里的 `overrides.vite`**，并把 `package.json` 的 `"vite"` 升到 `^5`（或更高）
- [ ] **顺手处理 sass 的 legacy JS API 警告**
  - 现在每次构建都会打 `DEPRECATION WARNING [legacy-js-api]`，来源是 vite 4.1 用旧的 sass JS API，而 sass 已经漂到 1.104
  - vite 5.4+ 支持 sass modern compiler API，升级后应该会消失
- [ ] **升级后重新验证**：`rm -rf node_modules && pnpm install --frozen-lockfile` → `pnpm build` → `pnpm build-pdf` → 对比 `dist/index.html` 渲染（上次迁移的基准截图在 `tmp/2026-09-17-pnpm-migration/`，未入库）

## 备注

`generate_pdf.mjs` 里的 `assert { type: 'json' }` 已经在迁移时改成 `with { type: 'json' }`（Node 22+ 移除了 `assert` 语法）——跟上面第 2 条是同一类问题，可以作为改 `icons.js` 时的参照。
