
const compiler = require('./src/compile');
const logger = require('./src/logger');
const fs = require("fs-extra");

const args = process.argv.splice(1);
const currentPath = process.cwd();
const serverPath = __dirname;

const command = args[1] || '';
const commandParams = args.slice(2) || [];

/**
 * 初始化命令集合
 * 
 */
function initCommandSet(serverPath, command, commandParams) {

    // logger(`当前包管理工具为 ${npm}.`, 'cyan');

    // let scriptCommand = `${npm} info just-spa version --json`;

    // // 如果不是init则不需要拉取版本号对比
    if (command !== 'version' && command !== 'v') {
        commandExcute();
        return;
    }

    // 对于其它的命令需要拉取远程版本号，实时提示更新升级
    // childProcess.exec(scriptCommand, (error, stdout, stderr) => {
    //     // 根据结果判断运行是否成功
    //     if (stdout.indexOf('Error') > -1) {
    //         logger(`获取远程版本号失败,正在使用本地版本.`, 'magenta');
    //         commandExcute();
    //     } else {
    //         if (error) {
    //             logger(`获取远程版本号失败,正在使用本地版本.`, 'magenta');
    //             commandExcute();
    //             return;
    //         }

    //         const latestVersion = stdout.replace(/\t|\n|\r|\"/ig, '');

    //         fse.readJson(`${serverPath}/package.json`).then((packageObj) => {
    //             if (packageObj.version != latestVersion) {
    //                 logger(`远程最新稳定just-spa版本为${latestVersion}，本地为${packageObj.version}，请尽快升级使用系统新的特性.`, 'magenta');
    //                 logger(`运行 "${npm} update just-spa -g" 升级.`, 'red');
    //                 logger('', 'red');
    //             } else {
    //                 logger(`本地just-spa已是最新版本.`, 'cyan');
    //             }
    //             commandExcute();
    //         }, () => {
    //             logger(`获取远程版本号失败,正在使用本地版本.`, 'magenta');
    //             commandExcute();
    //         });
    //     }
    // });

    commandExcute();

    function commandExcute() {
        // 命令行处理
        switch (command) {
            case 'c':
            case 'compile':
                if (!commandParams[0]) {
                    logger('tdsl c/compile [path] 缺少文件路径', 'cyan');
                } else {
                    compiler(commandParams[0]);
                }
                break;
            case '-v':
            case 'version':
                _showVersion();
                break;
            default:
                // 如果命令为空，且没有该命令，则提示没有该命令
                logger(`抱歉，没有找到"${command}"命令。您可以尝试just help来查看所有命令.`, 'red');
                _consoleHelp();
                break;
        }
    }
}

/**
 * 显示版本
 * 
 */
function _showVersion() {
    fs.readJson(`${serverPath}/package.json`).then(packageObj => {
        logger(`version: ${packageObj.version}`, 'cyan');
    });
}

function _consoleHelp() {
    logger(`
        您可以使用下面命令:
            tdsl compile/c filePath: 编译源码文件
        }
    `);
}

module.exports = () => {
    initCommandSet(serverPath, command, commandParams);
};