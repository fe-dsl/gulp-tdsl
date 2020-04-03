
const fs = require("fs-extra");
const path = require("path");
const _ = require("lodash");

// const typescriptTree = require("@typescript-eslint/typescript-estree");
const parser = require('@babel/parser');
const generate = require('@babel/generator');

let tdslConfig = require("../tdsl.config");

const {
    relativeDir,
    prasePackJsonDir, 
	parseAssetFromTestIo,
	parseCallType,
    parseFromSrcAndTestPath,
} = require('./utils');

const paramsPathSplit = ':of:';

const currentPath = process.cwd();

const packageJsonDir = prasePackJsonDir(currentPath);

// 按照执行目录向外寻找tdsl.config.js文件的配置
if (packageJsonDir) {
    const configPath = path.resolve(packageJsonDir, 'tdsl.config.js');
    const configExist = fs.existsSync(configPath);
    if (configExist) {
        const config = require(configPath);
        tdslConfig = Object.assign({}, tdslConfig, config);
    } else {
        console.log('can not find tdsl.config.js, using default');
    }
} else {
    console.log('can not find tdsl.config.js, using default');
}

/**
 * 根据原始代码相对路径和格式化后的函数模块生成测试用例代码
 *
 * @param {*} combinedExportFunctions
 * @param {*} filePath
 * @returns
 */
const parseTestFromFunctions = function (combinedExportFunctions, filePath) {
    if (!tdslConfig) {
        console.error('can not find tdsl.config.js');
    }
    const config = (tdslConfig.module || []).find((configItem) => {
        const reg = typeof(configItem.test) === 'string' ? new RegExp(configItem.test, 'g') : configItem.test;
        return reg.test(path.resolve(filePath).replace(/\\/g, '/'));
    });

    parseIoTestFunction(combinedExportFunctions, filePath, config);
}

/**
 * 分析IO类函数的测试用例模板
 *
 * @param {*} combinedExportFunctions
 * @param {*} filePath
 */
function parseIoTestFunction (combinedExportFunctions, filePath, config = {}) {

    let codeString = '';
    let registerVarPath = {}; // 数据路径是否已经注册
    // 已经通过文件路径读取过变量的值的记录
    const readedData = {};
    // 注册过的中间过程记录
    let registeredProcess = {};

    // 文件名
    const fileName = path.basename(filePath).split('.')[0] || '';

    // 最终输出test文件的目录
    const outputDir = path.dirname(path.join('./__test__/', filePath.replace(packageJsonDir, '')));

    // 最终输出test文件的文件路径
    const outputFilePath = path.join(outputDir, `${fileName}_test.js`); //`./__test__/${fileName}_test.js`;
    
    // 源代码文件相对test输出文件的相对路径
    let srcRelativePath = relativeDir(path.resolve(filePath), path.resolve(outputFilePath));

    // 项目根目录相对test输出文件的相对路径
    const rootRelativeDir = relativeDir(packageJsonDir, path.resolve(filePath)) + '../';

    const moduleNames = (combinedExportFunctions || []).map((item) => {
        return item.name;
    });


    // 分析解析import的模块变量名
    if (config.ui == 'miniprogram') {
        codeString = `const path = require("path");\n`;
    } else if (srcRelativePath) {
        codeString = `import { ${moduleNames.join(',')} } from "${srcRelativePath}";\n`;
    }
    
    // 如果import处有需要前置import的代码
    if (config.use && config.use.beforeAllCode) {
        codeString += config.use.beforeAllCode.replace('<rootDir>', rootRelativeDir);
    }

    // 分析每个导出需要测试的函数模块
    for (let functionItem of combinedExportFunctions) {
        let expectAssetion = '';

        // 需要提前执行一下函数
        let beforeCode = '';
        let afterCode = '';
        let asyncDone = '';

        let dataPaths = [];
        // 如果没有testio，说明没有解析到匹配的函数模块，则跳过
        if (!functionItem.testio) {
            continue ;
        }

        // 循环查找每个函数模块
        for (let testItem of functionItem.testio) {

            // 解析输入参数
            let paramsArr = testItem.input.map((param) => {
                // 如果参数中有path:"../data"等相对路径则识别为路径
                if (param.indexOf(paramsPathSplit) >= 0 && param.indexOf('{') < 0) {
                    return parseStructFromPath(param, registerVarPath, dataPaths, filePath, outputFilePath);
                } else {
                    return param;
                }
            });
            const params = paramsArr.join(',');

            // 解析输出断言变量
            if (testItem.output.indexOf(paramsPathSplit) >= 0 && testItem.output.indexOf('{') < 0) {
                testItem.output = parseStructFromPath(testItem.output, registerVarPath, dataPaths, filePath, outputFilePath);
            }

            // 分析断言方式
            const assetType = parseAssetFromTestIo(testItem);

            // 分析判断的属性
            const property = testItem.property;

            // 中间过程
            const processes = testItem.process;

            // 使用call或apply
            const callType = parseCallType(testItem);
            // 中间过程读取属性判断
            let moduleNameCall = `${functionItem.name}${callType}(${params})`;

            // 如果函数调用使用callby
            if (testItem.callType === 'callby' && paramsArr[0]) {
                moduleNameCall = `${paramsArr[0]}(${functionItem.name}${callType}(${paramsArr.slice(1)}))`
            }

            let hasProcess = processes && processes.length;
            let isTimesCall = hasProcess && processes.some((process) => {
                const times = process.match(/^(\d*)\(.+\)/)[1];
                return /\d+/.test(times + '');
            });

            if (config.ui && config.ui === 'miniprogram') {
                console.log('小程序官方ui测试不完善，敬请期待')
                // if (testItem.output) {
                //     const absolutePath = path.resolve(filePath).replace(path.resolve(packageJsonDir, 'src'), '').replace(/\\/g, '/');
                //     const projectRoot = path.resolve(packageJsonDir, 'dist').replace(/\\\\/g, '/');
                //     expectAssetion += `
                //         const id = simulate.load(path.join(__dirname, '../index'), 'parent-wrapper', {
                //             rootPath: path.join(__dirname, '../../../'),
                //             less: true
                //         }); // 此处必须传入绝对路径
                //         const comp = simulate.render(id); // 渲染成自定义组件树实例
                //         const parent = document.createElement('parent-wrapper'); // 创建父亲节点
                //         comp.attach(parent); // attach 到父亲节点上，此时会触发自定义组件的 attached 钩子
                //         const view = comp.querySelector('.index'); // 获取子组件 view
                //         expect(view.dom.innerHTML).toBe('index.properties'); // 测试渲染结果
                //         expect(window.getComputedStyle(view.dom).color).toBe('green'); // 测试渲染结果
                //     \n`;
                // }
            } else if (!hasProcess) {
                // 没有中间处理过程，如果是io测试模块
                if (testItem.output) {
                    expectAssetion += `expect(${moduleNameCall}${property}).${assetType}(${testItem.output});\n`;
                }
            } else if (hasProcess && !isTimesCall) {
                // 有中间处理，但是没有调用次数判断，说明是异步处理
                asyncDone = 'done';
                expectAssetion += `
                ${moduleNameCall}.then((data) => {
                    expect(${processes}${property}).${assetType}(${testItem.output});
                    done();
                }, (data) => {
                    expect(${processes}${property}).${assetType}(${testItem.output});
                    done();
                });`;
            } else if (isTimesCall) {
                // 如果有中间过程，且有次数判断，则说明是触发类用例
                beforeCode = `
                    jest.resetAllMocks();
                    ${moduleNameCall};
                `;
                afterCode = testItem.output ? `expect(${moduleNameCall}${property}).${assetType}(${testItem.output});\n` : '';

                // 如果是事件模块
                for (let process of processes) {
                    const times = process.match(/^(\d*)\(.+\)/)[1];
                    let processName = process.match(/^\d*\((.+)\)/)[1];
                    let processPath = '';

                    if (!/\d+/.test(times + '')) {
                        continue;
                    }

                    if (processName.indexOf(paramsPathSplit) > -1) {
                        const processNameArr = processName.split(paramsPathSplit);
                        processName = processNameArr[0];
                        processPath = processNameArr[1];
                    }

                    // 还有模块mock路径的情况
                    if (processPath) {
                        // 如果模块名没注册过
                        if (!registeredProcess[processName]) {
                            // 自动计算引入模块相对test文件的路径
                            const relativePath = parseFromSrcAndTestPath(processPath, filePath, outputFilePath);
                            codeString += `
                                import { ${processName} } from '${relativePath}';
                                jest.mock('${relativePath}', () => {
                                    return {
                                        ${processName}: jest.fn(),
                                    }
                                });
                            `;
                            registeredProcess[processName] = true;
                        }
                        expectAssetion += `
                            expect(${processName}).toBeCalledTimes(${times});
                        `;

                    } else {
                        // 如果模块名没注册过
                        if (!registeredProcess[processName]) {
                            codeString += `global.${processName} = jest.fn();`;
                            registeredProcess[processName] = true;
                        }
                        expectAssetion += `
                            expect(${processName}).toBeCalledTimes(${times});
                        `;
                    }
                }
            }
        }

        // 套入基本的test断言代码模板
        codeString = codeString + `
            test("${functionItem.name} module",(${asyncDone}) => {
                ${beforeCode}
                ${expectAssetion}
                ${afterCode}
            });
        `;

        // 根据数据路径，头部注入常量声明语句
        for (let dataPath of dataPaths) {
            // 自动计算引入模块相对test文件的路径
            let relativePath = dataPath.path;
            readedData[relativePath] = readedData[relativePath] || [];

            // 根据是否读取了变量名，生成对应的申明代码
            if (readedData[relativePath].indexOf(dataPath.propertyKey) < 0) {
                readedData[relativePath].push(dataPath.propertyKey);
            }
        }
    }

    // 分析所有的路径数据导入导出
    for (let pathKey in readedData) {
        if (readedData[pathKey].length > 0){
            codeString =  `import { ${readedData[pathKey].join(',')} } from "${pathKey}";\n`+ codeString;
        }
    }

    // 如果import处有需要后置import的代码
    if (config.use && config.use.afterAllCode) {
        codeString += config.use.afterAllCode.replace('<rootDir>', rootRelativeDir);
    }

    try {
        const ast = parser.parse(codeString, {
            sourceType: 'module',
        });
        const testCodeAst = generate.default(ast, {
            // minified: true,
            // retainLines: false,
        });
        fs.outputFileSync(outputFilePath, testCodeAst.code);
        console.log(`output: ${outputFilePath}`);
    } catch (e) {
        console.log('语法解析错误' + e);
        console.log(codeString);
    }
}



/**
 * 根据io变量语法处理替换
 *
 * @param {*} testIoItem
 * @param {*} registerVarPath 所有注册的语法路径，传入引用，会被修改
 * @param {*} dataPaths 需要返回使用的语法注册
 * @param {*} srcPath 代码文件绝对路径
 * @param {*} outputFilePath 输出文件相对当前目录路径
 * @returns
 */
function parseStructFromPath (testIoItem, registerVarPath, dataPaths, srcPath, outputFilePath) {

    const splitValue = testIoItem.replace(/\'|\"/g, '').split(paramsPathSplit);
    let dataPath = splitValue[1].indexOf('.js') >= 0 ? splitValue[1] : `${splitValue[1]}.js`;

    let relativeDataPath = parseFromSrcAndTestPath(dataPath, srcPath, outputFilePath);

    const dataKeyArr = splitValue[0].split('.');

    let dataVar = splitValue[0];
    let dataKey = '';
    if (dataKeyArr && dataKeyArr.length > 0) {
        dataKey = splitValue[0].replace(dataKeyArr[0], '');
        dataVar = dataKeyArr[0];
    }

    if (registerVarPath[splitValue[0]]) {
        // 如果已经注册，则使用原有的了路径和变量名，但是读取的属性路径要覆盖
        dataPaths.push(Object.assign(registerVarPath[path], {
            propertyKey: splitValue[0],
        }));
    } else {
        // 重新定义一个数据路径和一个变量名
        dataPaths.push({
            path: relativeDataPath,
            dataKey: '',
            propertyKey: dataVar,
        });
        registerVarPath[path] = {
            path: relativeDataPath,
            dataKey: '',
            propertyKey: dataVar,
        };
    }

    // 如果有key，则取key的值，否则显示全部
    if (splitValue[0]) {
        return `${splitValue[0]}`;
    } else {
        return '';
    }
}

module.exports = {
    parseTestFromFunctions,
};
