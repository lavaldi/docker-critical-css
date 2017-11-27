const puppeteer = require("puppeteer");
const critical  = require("critical");
const fs        = require("fs");

const config    = require("./config").getConfig();
const pathFiles = require("/usr/local/app/frontend/config/docker-path.js");

async function generateCritical(uri, file) {
    let body = "", cssContent = "";
    
    try {
        browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        console.info(`Init! ${config.host}${uri}`);
        await page.goto(`${config.host}${uri}`, {timeout: 120000});

        body = await page.content();
        
        const cssUrlsArr = body.match(/https?:\/\/(local\.|pre4b\.)?(cds|cdn)\.[a-z_\-0-9\.\/]+\.css\?v=[a-z0-9]+/g);
        
        for (let url of cssUrlsArr) {
            await page.goto(url);
            const cssContentTmp = await page.content();
            const regToDeleteTags = /(<([^>]+)>)/ig;
            const justCss = cssContentTmp.replace(regToDeleteTags, "");
            cssContent = cssContent + justCss;
        }
    } catch (e) {
        console.error(`Error in loading ${config.host}${uri}: ${e.message}`)
    }

    browser.close();

    if (cssContent === "") {
        console.info(`${config.host}${uri} doesn't have CSS :C`);
        return;
    }

    const fileTempName = `all-tmp${new Date().getTime()}.css`

    try {
        fs.writeFileSync(fileTempName, cssContent);
        console.info(`The temporal file ${fileTempName} was written`);
    } catch (e) {
        console.error(`Cannot write the temporal file ${fileTempName}: ${e.message}`);
    }

    critical.generate({
        html  : body,
        folder: "dist/",
        width : 1200,
        height: 678,
        minify: true,
        ignore: ["@font-face"],
        penthouse: {
            timeout: 120000,
            strict: true
        },
        css: [
            fileTempName
        ]
    }).then(function (output) {
        try {
            fs.unlinkSync(fileTempName);
            console.info(`The temporal file ${fileTempName} was deleted`);
        } catch (e) {
            console.error(`Cannot delete the temporal file all-tmp.css: ${e.message}`);
        }
        const separator = "</head>";
        const data = fs.readFileSync(`${pathFiles.output}${file}`, "utf8");
        const dataArr = data.split(separator);
        const dataWithCritical = `${dataArr[0]}<style>${output}</style>${separator}${dataArr[1]}`;
        try {
            fs.writeFileSync(`${pathFiles.output}${file}`, dataWithCritical);
            console.info(`Success! ${config.host}${uri}`);
        } catch (e) {
            console.error(`Cannot write file .phtml: ${e.message}`);
        }
    }).error(function (e) {
        console.error(`Something wrong with critical D:!!! ${e.message}`);
    });
  }

async function main () {
    for (let page of config.pages)
       await generateCritical(page.uri, page.file);
}

main();
