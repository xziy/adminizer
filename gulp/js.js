import gulp from "gulp";
import webpackStream from "webpack-stream";
import { paths } from "./paths.js";

export const js = () => {
	return gulp
		.src(paths.src.js, { sourcemaps: true })
		.pipe(
			webpackStream({
				mode: "development",
				output: {
					filename: "script.min.js",
				},
				optimization: {
					minimize: false,
				},
			})
		)
		.pipe(gulp.dest(paths.build.js));
};

export const jsProd = () => {
	return gulp
		.src(paths.src.js, { sourcemaps: false })
		.pipe(
			webpackStream({
				mode: "production",
				output: {
					filename: "script.min.js",
				},
				optimization: {
					minimize: true,
				},
			})
		)
		.pipe(gulp.dest(paths.build.js));
};
