Source code of https://cv.reorx.com.

This site is built on top of [jsoncv](https://github.com/reorx/jsoncv).
If you want to create your own CV site, please refer to the instructions
at jsoncv instead of forking this repository directly.

## Development

### Prepare environment

Node version is pinned in `mise.toml`, package manager is pnpm
(version pinned by the `packageManager` field in `package.json`).

```
mise install
pnpm i
```

`jsoncv` is a git submodule and a pnpm workspace package, so its dependencies
are installed together with the root ones. After updating the submodule, run
`pnpm i` again and commit the updated `pnpm-lock.yaml`.

### Run dev server

```
pnpm dev
```

### Deploy site

```
wrangler pages project create cv
pnpm build
wrangler pages publish dist
```
