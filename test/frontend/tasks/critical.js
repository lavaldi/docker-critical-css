const puppeteer = require("puppeteer");
const critical  = require("critical");
const fs        = require("fs");

const config    = require("./config").getConfig();
const pathFiles = require("/usr/local/app/frontend/config/docker-path.js");

async function scrape (uri) {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    console.info(`Init! ${config.host}${uri}`);
    await page.goto(`${config.host}${uri}`, {timeout: 120000});

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
        console.info(`${config.host}${uri} doesn't have CSS :C`);
        return;
    }

    const fileTempName = `all-tmp${new Date().getTime()}.css`;

    try {
        fs.writeFileSync(fileTempName, scrapedData.cssContent);
    } catch (e) {
        console.error(`Cannot write the temporal file ${fileTempName} for ${config.host}${uri}: ${e.message}`);
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
        ignore: ["@font-face"],
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
            console.error(`Cannot delete the temporal file ${fileTempName} for ${config.host}${uri}: ${e.message}`);
        }

        const separator = "</head>";
        let data = fs.readFileSync(`${pathFiles.output}${file}`, "utf8");

        // Get urls .css
        const urlPHPCssRoutes = data.match(/<\?=\$this->S\([\'a-z\/\. A-Z\_]+(?<!ie)\.css\'\);( )?\?>/g);
        console.log(urlPHPCssRoutes);

        // Delete <link> tag of CSSs
        data = data.replace(/<link href="<\?=\$this->S\([\'a-z\/\. A-Z\_]+(?<!ie)\.css\'\);( )?\?>([a-z=\" \/>])+/g, "");

        const dataArr = data.split(separator);

        // Create <nonscript> tag with .css links and load function
        let nonscript = "<noscript id='deferred-styles'>";
        for (let url of urlPHPCssRoutes) {
            nonscript = nonscript + `<link rel="stylesheet" type="text/css" href="${url}"/>`
        }
        nonscript = nonscript + `</noscript>
            <script>
                var loadDeferredStyles = function() {
                    var addStylesNode = document.getElementById("deferred-styles");
                    var replacement = document.createElement("div");
                    replacement.innerHTML = addStylesNode.textContent;
                    document.body.appendChild(replacement)
                    addStylesNode.parentElement.removeChild(addStylesNode);
                };
                var raf = requestAnimationFrame || mozRequestAnimationFrame || webkitRequestAnimationFrame || msRequestAnimationFrame;
                if (raf) raf(function() { window.setTimeout(loadDeferredStyles, 0); });
                else window.addEventListener('load', loadDeferredStyles);
            </script>`;

        // Put all together
        const dataWithCritical = `${dataArr[0]}<style>${output}</style>${nonscript}${separator}${dataArr[1]}`;

        // Overwrite .phtml file with dataWithCritical
        try {
            fs.writeFileSync(`${pathFiles.output}${file}`, dataWithCritical);
            console.info(`Success! ${config.host}${uri}`);
        } catch (e) {
            console.error(`Cannot write file .phtml: ${e.message}`);
        }
    }).error(function (e) {
        console.error(`Something wrong with critical :C ! ${e.message}`);
    });
  }

async function main () {
    for (let page of config.pages) {
        await scrape(page.uri).then((scrapedData) => {
            generateCritical(page.uri, page.file, scrapedData);
        }).catch((e) => {
            console.error(`Error in loading ${config.host}${page.uri}: ${e.message}`);
        })
    }
}

main();
