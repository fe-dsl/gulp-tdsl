

#### 测试用例类型

&emsp;&emsp;tdsl目前定义了四种类型的函数模块用例：

- (1) 同步数据处理转换类。用户输入数据，处理后输出判断是否符合预期。例如同步计算两个数字相加，

```
/*
 * 1 + 2的值是否为3
 * add(1, 2) => (3)
 */
export const add (a, b) => {
  return a + b;
}
```

- (2) 异步数据操作并判断操作后数据。例如异步请求接口，并把接口返回的数据dispatch到store上，然后判断store上数据是否符合预期(可能需要结合接口mock一起使用)。

```
/*
 * 请求接口数据，然后把返回的数据设置到store上，然后通过getState获取store上的数据的xx字段，值是否为{list:[]}
 * requestAndSetStore.callby('dispatch', {paramId: 1003}) -> (getState().xx) ==> ({list:[]})
 */
export const requestAndSetStore = (params = {}) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    axios(params).then((res) => {
      dispatch({
        type: 'xx',
        data: res.data
      });
      resolve();
    })
  }, reject)
}

```

- (3) 事件触发函数测试。一般用于测试触发函数执行时，是否调用了对应了业务逻辑函数，以及业务逻辑函数的次数。

```
/*
 * 执行initData时，分别执行了1次onChangeChartDate和2次getAdvertiserListInfo，其中两个函数都来自../action模块，并返回true
 * initData({}) -> 1('onChangeChartDate:of:../action') -> 1('getAdvertiserListInfo:of:../action') => (true)
 */
export const initData = function (options = {}) {
    onChangeChartDate(time);
    getAdvertiserListInfo({page: 1});
    getAdvertiserListInfo({page: 1});
    return true;
}

```

- (4) UI类测试。调用render函数后查找节点，判断其个数、类名、属性等是否符合预期

对于React技术栈UI测试，`npm i jest jest-babel @babel/preset-es2015 @babel/preset-env @babel/preset-react`，package.json可如下配置

```
  "jest": {
    "testRegex": "test/test.jsx?$",
    "moduleDirectories": [
      "node_modules"
    ],
    "transform": {
      "^.+\\.js": "<rootDir>/node_modules/babel-jest"
    },
    "collectCoverage": true
  }

```
.babelrc配置(babel7的配置)
```
{
  "presets": ["@babel/preset-env", "@babel/react"]
}
```

(待完善)
