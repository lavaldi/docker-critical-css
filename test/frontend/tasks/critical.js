const puppeteer = require("puppeteer");
const critical  = require("critical");
const fs        = require("fs");

const pathFiles = require("/usr/local/app/frontend/config/docker-path.js");

const url = "https://aptitus.com/";

async function scrape (url) {
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  console.info(`Init! ${url}`);
  await page.goto(`${url}`, {timeout: 120000});

  const body = await page.content();

  const cssUrlsArr = body.match(/https?:\/\/(local\.|pre4b\.)?(cds|cdn)\.[a-z_\-0-9\.\/]+(?<!ie)\.css\?v=[a-z0-9]+/g);

  let cssContent = "";

  for (let cssUrl of cssUrlsArr) {
    await page.goto(cssUrl);
    const cssContentTmp = await page.content();
    const regToDeleteTags = /(<([^>]+)>)/ig;
    const justCss = cssContentTmp.replace(regToDeleteTags, "");
    cssContent = cssContent + justCss;
  }

  browser.close();

  return {
    body,
    cssContent
  }
}

function generateCritical(url, file, scrapedData) {

  if (scrapedData.cssContent === "") {
    console.info(`${url} doesn't have CSS :C`);
    return;
  }

  const fileTempName = `tmp${new Date().getTime()}.css`;

  scrapedData.cssContent = scrapedData.cssContent.replace(/&gt;/g, ">");

  try {
    fs.writeFileSync(fileTempName, scrapedData.cssContent);
  } catch (e) {
    console.error(`Cannot write the temporal file ${fileTempName} for ${url}: ${e.message}`);
  }

  critical.generate({
    html  : scrapedData.body,
    folder: "dist/",
    dimensions: [{
      height: 736,
      width: 414
    }, {
      height: 678,
      width: 1200
    }],
    minify: true,
    ignore: ["@font-face", "background-image"],
    penthouse: {
      timeout: 120000,
      strict: true
    },
    css: [
      fileTempName
    ]
  }).then(function (output) {
    // Delete temporal file .css
    try {
      fs.unlinkSync(fileTempName);
    } catch (e) {
      console.error(`Cannot delete the temporal file ${fileTempName} for ${url}: ${e.message}`);
    }

    const dataWithCritical = `| <style>${output}</style>`;

    // Write .jade file with dataWithCritical
    try {
      fs.writeFileSync(`${file}/critical.jade`, dataWithCritical);
      console.info(`Success! ${url}`);
    } catch (e) {
      console.error(`Cannot write file ${file}/critical.jade: ${e.message}`);
    }
  }).error(function (e) {
    console.error(`Something wrong with critical :C ! ${e.message}`);
  });
}

async function main () {
  await scrape(url).then((scrapedData) => {
    generateCritical(url, pathFiles.output, scrapedData);
  }).catch((e) => {
    console.error(`Error in loading ${url}: ${e.message}`);
  })
}

main();
