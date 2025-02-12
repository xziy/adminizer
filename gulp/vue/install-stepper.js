import gulp from "gulp";
import webpackStream from "webpack-stream";
import path from "path";
import { VueLoaderPlugin } from "vue-loader";
import webpack from "webpack";
import { paths, srcFolder } from "../paths.js";

export const vueInstallStepper = () => {
	return gulp.src(`${srcFolder}/jsonForms/app.js`, { sourcemaps: true })
		.pipe(webpackStream({
			mode: "development",
			entry: `${srcFolder}/jsonForms/app.js`,
			output: {
				path: path.resolve('./assets/js/'),
				filename: "vue-installStepper.js"
			},
			module: {
				rules: [
					{ test: /\.vue$/, loader: "vue-loader" },
					{
						test: /\.css$/,
						use: ["vue-style-loader", "css-loader"]
					}
				],
			},
			experiments: {
				topLevelAwait: true
			},
			plugins: [
				new VueLoaderPlugin(),
				new webpack.DefinePlugin({
					__VUE_PROD_DEVTOOLS__: true,
					__VUE_OPTIONS_API__: true
				})
			]
		}))
		.pipe(gulp.dest(`${paths.build.js}/`));
};

export const vueInstallStepperProd = () => {
	return gulp.src(`${srcFolder}/jsonForms/app.js`, { sourcemaps: true })
		.pipe(webpackStream({
			mode: "production",
			entry: `${srcFolder}/jsonForms/app.js`,
			output: {
				path: path.resolve('./assets/js/'),
				filename: "vue-installStepper.js"
			},
			module: {
				rules: [
					{ test: /\.vue$/, loader: "vue-loader" },
					{
						test: /\.css$/,
						use: ["vue-style-loader", "css-loader"]
					}
				],
			},
			experiments: {
				topLevelAwait: true
			},
			plugins: [
				new VueLoaderPlugin(),
				new webpack.DefinePlugin({
					__VUE_PROD_DEVTOOLS__: false,
					__VUE_OPTIONS_API__: true
				})
			]
		}))
		.pipe(gulp.dest(`${paths.build.js}/`));
};
