
const fs = require("fs-extra");
const path = require("path");
const allParamsPathSplite = [':of:', ':mockof:'];

/**
 * 根据两个路径分析两者的相对路径
 *
 * @param {*} relative
 * @param {*} absolute
 * @returns
 */
function relativeDir(relative, absolute) {

    var rela = relative.split(/\\|\//);
    rela.shift();
    var abso = absolute.split(/\\|\//); 
    abso.shift();

	var num = 0;
	
	for (var i = 0; i < rela.length; i++) {
        if(rela[i] === abso[i]) {
            num++;
        } else {
			break;
		}
    }
	
	rela.splice(0, num);
	abso.splice(0, num);
	
	var str = '';
	
	for (var j = 0;j < abso.length - 1; j++) {
		str += '../';
	}
	
	if (!str) {
		str += './';
	}
	
	str += rela.join('/');
	
    return str;
}

/**
 * 从当前目录向上查找项目目录，依次找到tdsl.config.js
 *
 * @param {*} initDir
 * @returns
 */
function prasePackJsonDir(initDir) {
    const fileExist = fs.existsSync(path.resolve(initDir, 'package.json'));
    if (fileExist) {
        return initDir;
    } else {
        return prasePackJsonDir(path.resolve(initDir, '../'));
    }
}


/**
 * 根据符号返回断言方式
 *
 * @param {*} testIo
 * @returns
 */
function parseAssetFromTestIo (testIo) {

    switch (testIo.assetType) {
        case '=>':
            return 'toBe';
        case '==>':
            return 'toEqual';
        case '!=>':
            return 'not.toBe';
        case '!==>':
            return 'not.toEqual';
    }
}

/**
 * 判断函数是直接调用还是通过call或apply调用
 *
 * @param {*} testIo
 * @returns
 */
function parseCallType (testIo = {}) {
    if (['call', 'apply'].indexOf(testIo.callType) > -1) {
        return `.${testIo.callType}`;
    } else {
        return '';
    }
}

/**
 * 根据代码中的相对路径，结合代码文件所在的路径和最终生成test文件的路径计算一个相对路径
 *
 * @param {*} currentReletivePath
 * @param {*} srcPath
 * @param {*} outputFilePath
 * @returns
 */
function parseFromSrcAndTestPath (currentReletivePath, srcPath, outputFilePath) {
    let relativePath = relativeDir(path.resolve(path.join(srcPath, '../', currentReletivePath)), path.resolve(outputFilePath));
    return relativePath;
}

/**
 * 路径中是否含有:of:或者:mockof:
 *
 * @param {string} [pathParam='']
 */
function inSplitSignal(pathParam = '') {
    return allParamsPathSplite.some((splitString) => {
        return pathParam.indexOf(splitString) > -1;
    });
};

/**
 * 匹配分割符号进行分割
 *
 * @param {string} [pathParam='']
 * @returns
 */
function splitSignalArrayFromPath(pathParam = '') {
    const splitStr = allParamsPathSplite.find((splitString) => {
        return pathParam.indexOf(splitString) > -1;
    });
    return splitStr && pathParam.split(splitStr) || pathParam;
}

module.exports = {
	relativeDir,
	prasePackJsonDir,
	parseAssetFromTestIo,
	parseCallType,
    parseFromSrcAndTestPath,
    inSplitSignal,
    splitSignalArrayFromPath,
}