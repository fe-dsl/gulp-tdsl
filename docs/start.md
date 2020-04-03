
- **2、快速开始**


```
npm i gulp-tdsl --save-dev
```

&emsp;&emsp;配置gulp任务，就会自动读取文件分析出用例了，默认会在根目录生成__test__/目录，里面包含所有的用例代码。

```
const gulp = require('gulp');
const tdsl = require('gulp-tdsl');

gulp.task('tdsl', () => {
    return gulp.src(['src/**/data-adapter.js'])
        .pipe(tdsl())
        .pipe(gulp.dest('dist'))
});
```

&emsp;&emsp;为了不对源码造成入侵，也不额外维护文件，TDSL使用注释中书写的方式，必须在块代码注释中声明，否则不生效，但也不产生任何影响。