
const fs = require("fs-extra");

const typescriptTree = require("@typescript-eslint/typescript-estree");
const parserTest = require("./parse-test-from-functions");

/**
 * 讲解析到的单元测试io合并到解析完的函数中
 *
 * @param {*} functions
 * @param {*} testio
 * @returns
 */
function combineExportFunctionsWithParams (functions, testio) {
    functions.forEach((item) => {
        item.testio = testio[item.name];
    });
    return functions;
}

// 解析出所有的导出函数模块
function parseAllExportFuntions (ast) {

    const exportFunctions = ast.body.map((functionModule) => {
        return parserFunctionModule(functionModule);
    }).filter((item) => {
        return !!item;
    });

    return exportFunctions.map((functionModule) => {
        return parseToFormatedFunctionObject(functionModule);
    });
}

// 解析出export的函数模块
function parserFunctionModule (functionModule) {
    const isExportFunction = functionModule.type === 'ExportNamedDeclaration' && functionModule.declaration && functionModule.declaration.type === 'FunctionDeclaration';
    const isNormalFunction = functionModule.type === 'FunctionDeclaration';
    const isVariableDeclaration = functionModule.type === 'ExportNamedDeclaration' && functionModule.declaration && functionModule.declaration.type === 'VariableDeclaration';
    const isExportDefaultDeclaration = functionModule.type === 'ExportDefaultDeclaration' && functionModule.declaration && functionModule.declaration.type === 'ObjectExpression';
    const isMpComponent = functionModule.type === 'ExpressionStatement' && functionModule.expression && functionModule.expression.callee && functionModule.expression.callee.name === 'Component';

    if (isExportFunction) {
        // 判断 export function () {} 导出
        return functionModule.declaration;
    } else if (isNormalFunction){
        // normalFunctions.push(functionModule);
    } else if (isVariableDeclaration) {
        // 判断 export const XX = function () {} 或 export const XX = () => {} 导出 
        for (let functionItem of functionModule.declaration.declarations) {
            if (['FunctionExpression', 'ArrowFunctionExpression'].indexOf(functionItem.init.type) > -1) {

                return {
                    ...functionItem.init,
                    id: functionItem.id,
                };
            }
        }
    } else if (isExportDefaultDeclaration) {
        // console.log(functionModule.declaration.properties[0].value);
    } else if (isMpComponent) {
        return {
            params: [{
                typeAnnotation: Object,
            }],
            id: {
                name: 'Component'
            }
        }
    }
}


/**
 * 解析输出分析后的export函数模块，并对输出格式化
 *
 * @param {*} functionModule
 */
function parseToFormatedFunctionObject (functionModule) {
    const formated = {};

    // 解析函数名称阶段
    formated['name'] = functionModule.id && functionModule.id.name;

    // 解析函数参数阶段
    const params = functionModule.params;
    const formatedParams = params.map((param, index) => {
        if (param.typeAnnotation && param.typeAnnotation.type === 'TSTypeAnnotation') {
            return {
                name: param.name,
                type: param.typeAnnotation.typeAnnotation.type
            };
        } else {
            return {
                name: param.name,
                type: 'any',
            }
        }
    });
    formated['params'] = formatedParams;

    // 解析函数返回值阶段
    const returnType = functionModule.returnType;
    let retrunValue = {};
    if (returnType && returnType.type === 'TSTypeAnnotation') {
        retrunValue = {
            type: returnType.typeAnnotation.type,
        };
    }
    formated['return'] = retrunValue;

    return formated;
}

/**
 * 解析输出分析后的函数模块的参数类型输入输出
 *
 * @param {*} functionModule
 */
function parseInputOutputFromComment (comments) {
    const testio = {};
    for (let comment of comments) {
        if (comment.type === 'Block') {

            // 匹配注释中的测试描述语法，然后解析输出参数格式
            let valueString = comment.value.replace(/\s/g, '');

            // 根据判断符号进行前后匹配分割
            let matchReg = /([\w|\.]+)\((.*?)\)([\[|\]|\w|\.|\'|\"|\_|\-|\>|\(|\)]*)\s?(!?=?=>)\s?\((.*?)\)/g;
            
            let matchArr = valueString.match(matchReg);

            if (!matchArr) {
                continue;
            }
            
            for (let quot of matchArr) {
                // 正则获取函数名
                let name = quot.match(/^([\w|\d|\_|\.]+)\(/)[1];
                // 去掉函数名
                let rest = quot.replace(name, '');
                
                const splitSignal = /(\!?=?=>)|(\->)/g;

                let quotArr = rest.split(splitSignal);
                quotArr = quotArr.filter((item) => {
                    return item && !splitSignal.test(item)
                });

                // 断言判断符号
                const assectArr = rest.match(/(\!?=?=>)/);

                // 属性
                const property = quotArr[0].replace(/\(.*?\)/, '');

                // 输入参数数组
                const input = quotArr[0].replace(/\(|\)/g, '').replace(property, '');

                var paramsInput = [`${input}`];
                if (input.indexOf(',') > -1) {
                    // 参数含有复杂结构
                    eval(`paramsInput = [${input}];`);
    
                    paramsInput = paramsInput.map((item) => {
                        if (typeof(item) === 'object') {
                            return JSON.stringify(item);
                        } else {
                            return item.toString();
                        }
                    });
                }

                const parsedStruct = {
                    input: paramsInput, //input.split(','),
                    output: quotArr[quotArr.length - 1].replace(/\(|\)/g, ''),
                    assetType: assectArr[1] || '=>',
                    property: property,
                    process: quotArr.slice(1, quotArr.length - 1),
                    callType: name.split('.')[1] || '',
                };

                name = name.indexOf('call') > -1 || name.indexOf('apply') > -1 ? name.split('.')[0] : name


                testio[name] = testio[name] || [];
                testio[name].push(parsedStruct);
            }
        }
    }
    return testio;
}


const compile = function (filePath, options = {}) {

    const code = fs.readFileSync(filePath, 'utf-8');

    const ast = typescriptTree.parse(code, {
        comment: true,
        errorOnUnknownASTType: false,
        // filePath: 'estree.ts', // or 'estree.tsx', if you pass jsx: true
        jsx: true,
        loc: true,
        // loggerFn: undefined,
        range: true,
        // tokens: false,
        useJSXTextNode: false,
    });

    // 计算格式化后的函数名称，参数和return值
    const formatedExportFunctions = parseAllExportFuntions(ast);
    const testio = parseInputOutputFromComment(ast.comments);
    const combinedExportFunctions = combineExportFunctionsWithParams(formatedExportFunctions, testio);

    parserTest.parseTestFromFunctions(combinedExportFunctions, filePath);
}

module.exports = compile;