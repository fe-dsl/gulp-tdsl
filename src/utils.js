
const fs = require("fs-extra");
const path = require("path");

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

module.exports = {
	relativeDir,
	prasePackJsonDir,
}