const gulp = require('gulp');
const tdsl = require('gulp-tdsl');

gulp.task('tdsl', () => {
    return gulp.src(['src/**/data-adapter.js'])
        .pipe(tdsl())
        .pipe(gulp.dest('dist'))
});