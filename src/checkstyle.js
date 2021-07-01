import {installLatestCheckstyle} from "./download-checkstyle.js"

import _ from "lodash";
import fs from "fs-plus";
import { exec as exec } from "child_process";
import path from "path";
import normalize from "normalize-path";
import color from "ansi-colors";
const errors = {};
const ROOT = process.argv[2] || process.cwd();
const configPath = `./checkstyle/checkstyle-new.xml`;
const IGNORE_STRINGS = ['Starting audit...', 'Audit done.'];
if (!fs.isDirectorySync(ROOT)) {
    console.log(`${ROOT} cannot be founded`)
    process.exit(1);
}

function readChangeTxt(file) {
    if (fs.isFileSync(file)) {
        const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
        return lines;
    }
    return [];
}

const configFile = path.resolve(configPath);

function wrap(_path) {
    if (_path.includes(' ')) {
        return normalize(`"${_path}"`);
    }
    return normalize(_path);
}

function printBlue(text) {
    console.log(color.blue(text));
}

function printRed(text) {
    console.log(color.red(text));
}

function checkJavaFile(file, jarFile) {
    return new Promise((resolve, reject) => {
        exec('java -cp ' + wrap(jarFile) +
            ` -Dconfig_loc=${wrap(path.dirname(configFile))}  com.puppycrawl.tools.checkstyle.Main ` + ' -c ' + wrap(configFile) + ' ' + wrap(file),
            (err, stdout, stderr) => {
                console.log("Checking file", file);
                const lines2 = _.filter(stdout.split(/\r?\n/), d => d && !IGNORE_STRINGS.includes(d));
                if (stderr.match(/ends with [0-9]* errors/)) {
                    printRed(stderr);
                    let prevFile = undefined;
                    for (const output of lines2) {
                        if (output.startsWith('[INFO]')) {
                            console.log(output);
                        } else {
                            let targetFile = output.split('.java:')[0];
                            const thisFile = targetFile.slice(targetFile.indexOf(']') + 2).trim() + '.java';
                            if (prevFile != thisFile) {
                                printBlue(thisFile);
                                prevFile = thisFile;
                            }
                            printRed('  ' + output.slice(output.indexOf('.java:') + 6));
                        }
                    }
                } else {
                    if (lines2.length) {
                        console.log(lines2.join('\n'));
                    }
                }

                if (err) {
                    errors[file] = stderr;
                    resolve();
                    return;
                }
                resolve();
            });
    });
}

async function checkChangesForFile() {
    const checkstyleJar = await installLatestCheckstyle(ROOT);
    if (!fs.isFileSync(checkstyleJar)) {
        throw new Error(`Cannot download checkstyle.`);
    }
    const lines = readChangeTxt(path.join(ROOT, 'changes.txt'));
    const files = [];
    for (const l of lines) {
        const file = path.join(ROOT, l);
        if (fs.isFileSync(file) && path.extname(file) === '.java') {
            files.push(normalize(file));
        }
    }
    for (const file of _.uniq(files)) {
        await checkJavaFile(file, checkstyleJar);
    }

    if (Object.keys(errors).length > 0) {
        for (const key of Object.keys(errors)) {
            console.error(path.basename(key), errors[key]);
        }
        process.exit(1)
    } else {
        console.log('Checkstyle task done.')
    }
}

checkChangesForFile().catch(console.log);
