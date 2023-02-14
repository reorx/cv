import fs from 'fs';
import {
  extname,
  resolve,
} from 'path';
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { TransformEjs } from './jsoncv/src/lib/vite-plugins';
import { getRenderData } from './jsoncv/src/themes/data';

const dataFilename = process.env.DATA_FILENAME || './cv.json'

const data = require(dataFilename)
const renderData = getRenderData(data)
renderData.theme = process.env.THEME || 'reorx'
renderData.primaryColor = process.env.PRIMARY_COLOR || '#2A3FFB'
renderData.isProduction = process.env.NODE_ENV === 'production'
renderData.meta = {
  title: "Xiao Meng",
  description: "Xiao Meng's CV",
  url: "https://cv.reorx.com",
  twitter: {
    card: "summary",
    username: "novoreorx",
  }
}

const pdfFiles = fs.readdirSync('public').filter(file => extname(file) === '.pdf')
renderData.pdfURL = '/' + pdfFiles[0]


export default defineConfig({
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      // remove the "Module "fs" has been externalized" warning for ejs
      'fs': 'jsoncv/src/lib/fs-polyfill.js',
    },
  },
  plugins: [
    TransformEjs(),
    ViteEjsPlugin(
      renderData,
      {
        ejs: (viteConfig) => ({
          // ejs options goes here.
          views: [resolve(__dirname)],
        })
      }
    ),
    viteSingleFile(),
  ],
})
