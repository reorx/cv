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

### Edit cv.json with the jsoncv Editor

The editor is a separate Vite entry inside the `jsoncv` submodule, so it needs
its own dev server:

```
cd jsoncv
pnpm dev-site
```

Then open `/editor/` on the port printed at startup (5173 when free, otherwise
the next one — `pnpm dev` above competes for the same range).

The editor stores its data in the browser's localStorage, not on disk, so it
never reads or writes `cv.json` by itself. Editing our data is a manual round
trip:

1. Click **Upload Data** and pick `cv.json`, otherwise the form shows whatever
   is left in localStorage (or jsoncv's sample data on a fresh browser)
2. Edit the form; every change is saved to localStorage right away
3. Click **Download JSON**. This also refreshes `meta.lastModified`
4. Move the downloaded file back over `cv.json`:

    ```
    mv ~/Downloads/Xiao_Meng-CV-v1.3.1.json cv.json
    ```

    The filename is `meta.name` + `meta.version`, so it changes when the
    version does.

Step 4 is easy to forget, and skipping it silently discards the edit.

The round trip is worth it for structural changes — adding a whole new section,
or checking a field against the schema. For wording tweaks, editing `cv.json`
directly while `pnpm dev` re-renders is faster; point your editor at
`jsoncv/schema/jsoncv.schema.json` to get completion and validation there.

### Deploy site

```
wrangler pages project create cv
pnpm build
wrangler pages publish dist
```

### Export Markdown

```
pnpm build-md            # writes tmp/<meta.name>-<version>.md from cv.json
node generate_md.mjs out # or write to another directory
pnpm test
```
