const puppeteer = require("puppeteer");
const critical  = require("critical");
const fs        = require("fs");

const config    = require("./config").getConfig();
const pathFiles = require("/usr/local/app/frontend/config/docker-path.js");

async function scrape (uri) {
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  console.info(`Init! ${config.host}/${uri}`);
  await page.goto(`${config.host}/${uri}`, {timeout: 120000});

  const body = await page.content();

  const cssUrlsArr = body.match(/https?:\/\/(local\.|pre4b\.)?(cds|cdn)\.[a-z_\-0-9\.\/]+(?<!ie)\.css\?v=[a-z0-9]+/g);

  let cssContent = "";

  for (let url of cssUrlsArr) {
    await page.goto(url);
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

function generateCritical(uri, file, scrapedData) {

  if (scrapedData.cssContent === "") {
    console.info(`${config.host}/${uri} doesn't have CSS :C`);
    return;
  }

  const fileTempName = `tmp${uri}${new Date().getTime()}.css`;

  scrapedData.cssContent = scrapedData.cssContent.replace(/&gt;/g, ">");

  try {
    fs.writeFileSync(fileTempName, scrapedData.cssContent);
  } catch (e) {
    console.error(`Cannot write the temporal file ${fileTempName} for ${config.host}/${uri}: ${e.message}`);
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
      console.error(`Cannot delete the temporal file ${fileTempName} for ${config.host}/${uri}: ${e.message}`);
    }

    const dataWithCritical = `| <style>${output}</style>`;

    // Write .jade file with dataWithCritical
    try {
      fs.writeFileSync(`${pathFiles.output.critical}${file}/critical.jade`, dataWithCritical);
      console.info(`Success! ${config.host}/${uri}`);
    } catch (e) {
      console.error(`Cannot write file ${pathFiles.output.critical}${file}/critical.jade: ${e.message}`);
    }
  }).error(function (e) {
    console.error(`Something wrong with critical :C ! ${e.message}`);
  });
}

async function main () {
  for (let page of config.pages) {
    await scrape(page.uri).then((scrapedData) => {
      generateCritical(page.uri, page.fileRoute, scrapedData);
    }).catch((e) => {
      console.error(`Error in loading ${config.host}/${uri}: ${e.message}`);
    })
  }
}

main();
