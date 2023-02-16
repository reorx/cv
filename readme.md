Source code of https://cv.reorx.com.

This site is built on top of [jsoncv](https://github.com/reorx/jsoncv).
If you want to create your own CV site, please refer to the instructions
at jsoncv instead of forking this repository directly.

## Development

### Prepare environment

```
npm i
```

### Run dev server

```
npm run dev
```

### Deploy site

```
wrangler pages project create cv
npm run build
wrangler pages publish dist
```
