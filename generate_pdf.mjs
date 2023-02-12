import { readFileSync } from 'fs';
import { launch } from 'puppeteer';

async function generatePDF(html, outputPath) {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({
    format: 'A4',
    displayHeaderFooter: false,
    preferCSSPageSize: true,
    path: outputPath,
  });
  await browser.close();
  console.log('generatePDF completed')
  return pdf;
}

// read file dist/index.html
const html = readFileSync('dist/index.html', 'utf8');

// match title
const titleRegex = /<title>(.*)<\/title>/;
const title = html.match(titleRegex)[1];

console.log("call generate pdf")
await generatePDF(html, `dist/${title}.pdf`)
console.log("call end")