import gulp from "gulp";
import sourcemaps from "gulp-sourcemaps";
import gulpPostcss from "gulp-postcss";
import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import rename from "gulp-rename";
import { paths } from "./paths.js";
import dartSass from "sass";
import gulpSass from "gulp-sass";
import postcssImport from "postcss-import";
const sass = gulpSass(dartSass);


export const scss = () => {
	return gulp
		.src(paths.src.scss, { sourcemaps: true })
		.pipe(sourcemaps.init())
		.pipe(
			sass
				.sync({
					includePaths: ["./node_modules"],
					outputStyle: "expanded",
				})
				.on("error", sass.logError)
		)
		.pipe(
			gulpPostcss(
				[
					postcssImport,
					tailwindcss(),
					autoprefixer({
						overrideBrowserslist: ["Last 3 versions"],
						cascade: false,
					}),
					cssnano,
				],
				{}
			)
		)
		.pipe(
			rename({
				extname: ".min.css",
			})
		)
		.pipe(sourcemaps.write("."))
		.pipe(gulp.dest(paths.build.css));
};

export const scssProd = () => {
	return gulp
		.src(paths.src.scss, { sourcemaps: true })
		.pipe(
			sass
				.sync({
					includePaths: ["./node_modules"],
					outputStyle: "expanded",
				})
				.on("error", sass.logError)
		)
		.pipe(
			gulpPostcss(
				[
					postcssImport,
					tailwindcss(),
					autoprefixer({
						overrideBrowserslist: ["Last 3 versions"],
						cascade: false,
					}),
					cssnano,
				],
				{}
			)
		)
		.pipe(
			rename({
				extname: ".min.css",
			})
		)
		.pipe(gulp.dest(paths.build.css));
};
