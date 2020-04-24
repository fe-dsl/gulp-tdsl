
- **TDSL基本语法**

#### 1、断言比较。相等 =>、深度相等 ==>、不相等 !=>、深度不相等 !==>

**1.1、fn(...Params) => (returnValue)**。调用函数方法，返回预期的校验值，如果没有returnValue，则没有断言判断输出，例如：

```
/* name function B
 * this is test
 * B(1, 3) => (3)
 * B(1, 4) => ()
 */
export function B (a: number, b: number): number {
    return a * b;
}
```

&emsp;&emsp;自动编译后，B(1, 3) => (3) 规则会生效，但 B(1, 4) => () 不会编译输出：

```
test("B module", () => {
    expect(B(1, 3)).toBe(3);
});
```

**1.2、fn(...Params) ==> (returnValue)**。如果判断输出是否深度相等，则可使用 ==>，例如：

```
/* name B
 * this is test
 * B(1, 3) ==> ({value: 3})
 */
export function B (a: number, b: number): number {
    return {
      value: a * b
    };
}
```

&emsp;&emsp;自动编译后，输出：

```
test("B module", () => {
    expect(B(1, 3)).toEqual({value:3});
});

```

**1.3、fn(...Params) !=> (returnValue)**。例如

```
/* name B
 * this is test
 * B(1, 3) !=> (4)
 */
export function B (a: number, b: number): number {
    return a * b;
}
```

&emsp;&emsp;自动编译后输出：

```
test("B module", () => {
    expect(B(1, 3)).not.toBe(4);
});

```

**1.4、fn(...Params) !==> (returnValue)**。例如

```
/* name B
 * this is test
 * B(1, 3) !==> (4)
 */
export function B (a: number, b: number): number {
    return a * b;
}
```

&emsp;&emsp;自动编译后输出：

```
test("B module", () => {
    expect(B(1, 3)).not.toEqual(4);
});

```

#### 2，常量路径 :of:

**("data.dataKey1:of:path", "data.dataKey:of:path", ...params) => ('data.dataKey:of: path')**

&emsp;&emsp;如果我们要处理的样本数据太大，需要从外部一个数据文件中导出使用，就可以使用:of:。使用:of:分割，:of:前为读取mock数据的属性key，如果没有key则表示无输入，后面为相对路径，**此时参数输入必须为字符串**，相对路径最终会根据生成用例文件的路径对比，计算出一个新的相对路径，而且相同重复的路径最终会自动合并到一个import语句。

```
/**
 * name B
 * A("a:of:./data.js", 3) => (3)
 * A("b:of:./data.js", "d:of:./data1.js") => (1)
 * A("a:of:./data.js", 1) => ("a.b:of:./data1.js")
 */
export function B (a: number, b: number): number {
    return a * b;
}
```

&emsp;&emsp;其中data.js和data1.js文件内容为：(支持export和module.exports导出)

```
// data.js
module.exports = {
    a: 1,
    b: 1
};

// data1.js
export default {
    c: 1,
    d: 1
}
```

&emsp;&emsp;自动编译后，常量路径会被自动计算并填充到变量：

```
import { a, b } from '../data.js';
import { c, d } from '../data1.js';
test("B module", () => {
    expect(B(a, 3)).toBe(3);
    export(B(b, d)).toBe(1);
    export(B(a, 1)).toBe(a.b);
});

```

#### 3, 析构常量路径 [Number]...[key]:of:

**("[number]...data.dataKey1:of:path", ...params) => ('data.dataKey:of: path')**

&emsp;&emsp;常量路径能够帮助我们引入文件数据，简化脚本长度，但是如果有时需要引入多个常量路径，脚本仍不够简洁，这时就可以使用析构常量路径。**注意此时常量路径输出必须是数组类型才生效**，其中数字表示使用前面多少个参数，方便不同个数参数复用，如果不设置，则自动为函数的最大参数个数计算。


```
/**
 * name B
 * A("2...params:of:./data.js", 3) => (6)
 * A("...params1:of:./data.js") => (6)
 */
export function B (a: number, b: number,  c: number): number {
    return a + b + c;
}
```

&emsp;&emsp;其中data.js文件内容为：(支持export和module.exports导出)

```
// data.js
module.exports = {
    params: [1, 2]，
    params1: [1, 2, 3]
};
```

&emsp;&emsp;自动编译后，常量路径会被自动计算并填充到变量：

```
import { params, params1 } from '../data.js';
test("B module", () => {
    expect(B(params[0], params[1], 3)).toBe(6);
    expect(B(params1[0], params1[1], params1[2])).toBe(6);
});

```


#### 4, 属性判断

**fn(...Params).property => (lengthValue)**

&emsp;&emsp;属性读取判断，所以尽可能使用这条规则实现更多的原始判断，例如：

```
/* name B
 * B(1, 3).length => (1)
 * B(1, 3)['length'] => (1)
 * B(1, 3)['length']['xxx'] !=> (1)
 */
export function B (a: number, b: number): number {
    return a * b;
}
```

&emsp;&emsp;自动编译后输出：

```
test("B module", () => {
    expect(B(1, 3).length).toBe(1);
    expect(B(1, 3)['length']).toBe(1);
    expect(B(1, 3)['length']['xxx']).not.toBe(1);
});
```

#### 5，异步判断

**fn(...params) -> (module.property) ==> (returnValue)**

&emsp;&emsp;有时我们需要异步执行一个函数，然后再判断某个变量是否符合预期。例如：异步执行fn，然后判断module的property属性值是否和returnValue相符。**注意：这里因为右侧只能写一个输出数据，所以中间过程仅支持一项**，如果有多个，请分多条书写。

```
/**
 * 拉取接口数据，然后把接口数据dispatch到store上，然后判断store的数据是否符合预期
 * getOverviewChart({}) -> (getState().apiData) ==> ({chart: {a:1}})
 */
export const getOverviewChart = (params = {}) => {
  // ...request操作，然后dispatch数据到store的apiData
  ...
}

```

&emsp;&emsp;编译后输出：

```
test("getOverviewChart module", done => {
  getOverviewChart({}).then(() => {
    expect(getState().apiData).toEqual({
      chart: {
        a: 1
      }
    });
    done();
  }, () => {});
})
```

&emsp;&emsp;如果是async异步函数，则会解析编译为：

```
test("async getOverviewChart module", async done => {
    await getOverviewChart({});
    expect(getState().apiData).toEqual({
      chart: {
        a: 1
      }
    });
})
```

#### 6, 二阶异步判断

**moduleName(fn(...params)) -> (module.property) -> (returnValue)**

&emsp;有时模块函数可能是高阶函数，需要嵌套一次调用测试，例如: dispatch(A())。目前最多支持二阶函数。

```
/**
 * 拉取接口数据，然后把接口数据dispatch到store上，然后判断store的数据是否符合预期
 *
 * dispatch(getOverviewChart({})) -> (getState().apiData) ==> ({chart: {a:1}})
 */
export const getOverviewChart = (params = {}) => (dispatch, getState) => {
  // ...request操作，然后dispatch数据到store的apiData
  ...
}
```

&emsp;&emsp;编译后输出

```
test("getOverviewChart module", done => {
  dispatch(getOverviewChart({})).then(() => {
    expect(getState().apiData).toEqual({
      chart: {
        a: 1
      }
    });
    done();
  }, () => {});
})
```

#### 7, 触发调用次数判断

**fn(...params) -> number1('module1:of:path') -> ... -> number2('module2') => (returnValue)**

&emsp;&emsp;常常我们会去测试一个事件触发时是否调用了一些数据业务逻辑，这种情况可以使用调用次数的判断。例如，fn调用时调用module1次数为number1，调用module2次数为number1，module1来自path路径的文件，module1和module2均会被自动mock，然后返回断言值为returnValue。中间的调用判断支持多项，并支持自动合并。注意这里 number1('module1:of:path') -> (module) 不能和异步判断混用。如果需要多次判断，请分多条规则书写。

```
/*
 * initData({}) -> 1(onChangeChartDate:of:../action) -> 1(getAdvertiserListInfo:of:../action) => ()
 * 执行initData时，分别执行了1次onChangeChartDate和1次getAdvertiserListInfo，其中两个函数都来自../action模块
 */
export const initData = function (options = {}) {
    onChangeChartDate(time);
    getAdvertiserListInfo({page: 1});
}

```
&emsp;&emsp;这里的模块路径均会被自动重新计算和自动mock，编译后输出：

```
import { onChangeChartDate, getAdvertiserListInfo } from '../action';
jest.mock('../action', () => {
  return {
    onChangeChartDate: jest.fn(),
    getAdvertiserListInfo: jest.fn(),
  };
});
test("initData module", () => {
  jest.resetAllMocks();
  initData();
  expect(onChangeChartDate).toBeCalledTimes(1);
  expect(getAdvertiserListInfo).toBeCalledTimes(1);
});
```

#### 8, this绑定call、apply

**fn.call(this, ...params) -> number1('module1:of:path') -> ... -> number2('module2:of:path') => (returnValue)**

**fn.apply(this, [...params]) -> number1('module1:of:path') -> ... -> number2('module2:of:path') => (returnValue)**

&emsp;&emsp;有时验证一个模块时，由于模块可能依赖了this的一些方法和属性，才能运行，此时我们就需要mock一个this，然后用call或apply进行绑定。推荐使用call，apply后面数组元素如果引用了路径不会被解析。前面的方法模块均支持和call或apply绑定。

```
/**
 * 初始化页面数据
 * initData.call('mockThis:of:./data.js', {}) -> 1(getMessageList:of:./action) => (true)
 */
export const initData = function (options = {}) {
    getMessageList({page: 1});
    this.setData({
      a: 1,
    });
    return true;
}
```

```
// 其中./data.js中包含

export const mockThis = {
  setData: () => {},
  xxx...
}
```

&emsp;&emsp;编译后输出：

```
import { mockThis } from "../data.js";
import { getMessageList } from '../action';
jest.mock('../action', () => {
  return {
    getMessageList: jest.fn()
  };
});
test("initData module", () => {
  jest.resetAllMocks();
  initData.call(mockThis, {});
  expect(getMessageList).toBeCalledTimes(1);
  expect(initData.call(mockThis, {})).toBeCalledTimes(1);
});
```