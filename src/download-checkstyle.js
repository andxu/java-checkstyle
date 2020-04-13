const metaUrl = `https://api.github.com/repos/checkstyle/checkstyle/releases/latest`;

const fetchJson = require('fetch-json');
const fetch = require('node-fetch');
const _ = require('lodash');
const fs = require('fs-plus')
const path = require('path');
const mkdirp = require('mkdirp');

 async function getMeta() {
     return fetchJson.get(metaUrl);
 }

 async function installLatestCheckstyle(folder) {
    const data = await getMeta();
    const downloadUrl = _.get(data, 'assets[0].browser_download_url');
    if (!downloadUrl || !downloadUrl.startsWith('https://')) {
        throw new Error(`Cannot get browser_download_url from checkstyle repo.`);
    }
    const targetFile = path.join(folder, path.basename(downloadUrl));
    if (fs.isFileSync(targetFile)) {
        console.log(`Use exist file: ${targetFile}`);
        return targetFile;
    }
    mkdirp.sync(folder);
    const buffer = await fetch(downloadUrl).then(res => res.buffer())
    fs.writeFileSync(targetFile, buffer);
    console.log(`Download to file: ${targetFile}`);
    return targetFile;
 }


exports.installLatestCheckstyle = installLatestCheckstyle;
