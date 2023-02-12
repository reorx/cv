const puppeteer = require('puppeteer');
const fs = require('fs');

async function generatePDF(html, outputPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({
    format: 'A4',
    displayHeaderFooter: false,
    preferCSSPageSize: true,
    path: outputPath,
  });
  await browser.close();
  return pdf;
}

// read file dist/index.html
const html = fs.readFileSync('dist/index.html', 'utf8');

// match title
const titleRegex = /<title>(.*)<\/title>/;
const title = html.match(titleRegex)[1];

generatePDF(html, `dist/${title}.pdf`)
