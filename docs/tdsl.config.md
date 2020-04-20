
#### 4、tdsl.config配置

&emsp;&emsp;tdsl是基于jest的跨框架单元测试描述脚本语法，tdsl.config.js用于配置项目，项目中tdsl会自动查找项目中的tdsl.config.js配置文件。

| 字段名 | 说明 | 默认值 |
|-|-|-|
| module | 匹配对应的文件并应用规则 |[]|


| module字段名 | 说明 | 默认值 |
|-|-|-|
| async | 异步测试类型 |默认null，如果为async，则用例代码为async输出；如果为promise，则是promise类型。async也可以测试promise的源码|
| test | 必需，文件路径统配符字符串 |null|
| use | 使用规则：beforeAllCode、afterAllCode |{}|
| ui | UI测试类型，如果设置了，说明模块为ui测试 |null，需要设置为vue、react、miniprogram来标识几种不同ui|

&emsp;&emsp;一个tdsl.config.js配置例子如下：

````

module.exports = {
    module: [{
        test: "src/.*/data-adapter.js",
    }, {
        async: 'async',
        test: "src/.*/action.js",
        use: {
            // 会出现在测试文件头部
            beforeAllCode: `
                import { useDispatch, initStore, getState } from '../../../initStore';
                initStore({});
                const dispatch = useDispatch();
            `,
            // 会出现在测试文件尾部
            afterAllCode: '',
        }
    }, {
        async: 'promise',
        test: "src/.*/methods.js",
        use: {
            beforeAllCode: `
            jest.clearAllMocks();
            jest.mock('../../../initStore',() => {
                return {
                    useDispatch: jest.fn(),
                }
            });
            `,
        }
    }, {
        test: 'src/biz-components/.*/index.js',
        use: {
            beforeAllCode: `
            jest.clearAllMocks();
            jest.mock('../../../initStore',() => {
                return {
                    useDispatch: jest.fn(),
                }
            });
            const simulate = require('miniprogram-simulate');
            `,
            afterAllCode: ``,
        },
        ui: 'miniprogram',  // 标识为ui类用例，并且是小程序类ui
    }]
};
````

(待完善补充)