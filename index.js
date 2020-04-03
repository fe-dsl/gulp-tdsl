const through = require("through2");
const compile = require("./src/compile");

module.exports = function (options) {
    // console.log(options);
    const stream = through.obj(function (file, encoding, callback) {

        // 如果file类型不是buffer 退出不做处理
        if (!file.isBuffer()) {
            return callback();
        }

        compile(file.path, options || {});

        // 确保文件会传给下一个插件，此处不需要
        // this.push(file);

        // 告诉stream引擎，已经处理完成
        callback();
    });

    return stream;
}
