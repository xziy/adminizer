import gulp from 'gulp';
import { deleteAsync } from 'del';
import webpackStream from 'webpack-stream';
import path from 'path';
import ckeditorUtils from '@ckeditor/ckeditor5-dev-utils';
const { styles } = ckeditorUtils;
import CKEditorWebpackPlugin from '@ckeditor/ckeditor5-dev-webpack-plugin';
import browserSyncLib from 'browser-sync';
const browserSync = browserSyncLib.create();

import { vueCatalog, vueCatalogProd } from "./gulp/vue/catalog.js";
import { vueInstallStepper, vueInstallStepperProd } from "./gulp/vue/install-stepper.js";
import { vueMediamanager, vueMediamanagerProd } from "./gulp/vue/mediamanager.js";
import { vueWidgets, vueWidgetsProd } from "./gulp/vue/widgets.js";
// import { scss, scssProd } from './gulp/styles.js';
import { copy_files } from "./gulp/copy.js";
import { js, jsProd } from './gulp/js.js';
import { paths, srcFolder } from './gulp/paths.js';

// const reset = () => {
// 	return deleteAsync(paths.clean);
// };
//
// const serve = (done) => {
// 	browserSync.init({
// 		proxy: {
// 			target: 'localhost:1337',
// 			ws: true,
// 		},
// 		open: false,
// 		port: 7000,
// 		notify: false,
// 	});
// 	done();
// };
//
// const reload = (done) => {
// 	browserSync.reload();
// 	done();
// };

const ckeditorBuild = () => {
	return gulp
		.src(`${srcFolder}/scripts/ckeditor5/app.js`, { sourcemaps: true })
		.pipe(
			webpackStream({
				mode: 'production',
				devtool: 'source-map',
				performance: { hints: false },
				entry: `${srcFolder}/scripts/ckeditor5/app.js`,
				output: {
					path: path.resolve('./dist/assets/build/js/ckeditor5'),
					filename: 'ck5.js',
					library: 'ClassicEditor',
					libraryTarget: 'umd',
					libraryExport: 'default',
				},
				resolve: {
					alias: {
						'@ckeditor': path.resolve('node_modules', '@ckeditor'),
					},
				},
				plugins: [
					new CKEditorWebpackPlugin({
						language: 'en',
						additionalLanguages: 'all',
					}),
				],
				module: {
					rules: [
						{
							test: /ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/,
							use: ['raw-loader'],
						},
						{
							test: /ckeditor5-[^/\\]+[/\\]theme[/\\].+\.css$/,
							use: [
								{
									loader: 'style-loader',
									options: {
										injectType: 'singletonStyleTag',
										attributes: {
											'data-cke': true,
										},
									},
								},
								'css-loader',
								// TODO crashes the build
								{
									loader: 'postcss-loader',
									options: {
										postcssOptions: styles.getPostCssConfig({
											themeImporter: {
												//themePath: require.resolve('@ckeditor/ckeditor5-theme-lark'),
											},
											minify: true,
										}),
									},
								},
							],
						},
					],
				},
			})
		)
		.pipe(gulp.dest(`${paths.build.js}/ckeditor5/`));
};

// function watcher() {
// 	gulp.watch(paths.src.ejs, gulp.series(scss, reload));
// 	gulp.watch(paths.src.scss, gulp.series(scss, reload));
// }
//
// function vueWidgetsWatcher() {
// 	gulp.watch(`${srcFolder}/widgets/**/*.*`, gulp.series(vueWidgets, reload));
// 	gulp.watch(paths.watch.scss, gulp.series(scss, reload));
// }
//
// function vueCatalogWatcher() {
// 	gulp.watch(`${srcFolder}/catalog/**/*.*`, gulp.series(vueCatalog, reload));
// 	gulp.watch(paths.watch.scss, gulp.series(scss, reload));
// 	gulp.watch(paths.watch.catalogVue, gulp.series(scss, reload));
// }
//
// function vueMMWatcher() {
// 	gulp.watch(`${srcFolder}/mediamanager/**/*.*`, gulp.series(vueMediamanager, reload));
// 	gulp.watch(paths.watch.scss, gulp.series(scss, reload));
// 	gulp.watch(paths.watch.MMVue, gulp.series(scss, reload));
// }
//
// function vueInstallStepperWatcher() {
// 	gulp.watch(`${srcFolder}/installStepper/**/*.*`, gulp.series(vueInstallStepper, reload));
// 	gulp.watch(paths.watch.scss, gulp.series(scss, reload));
// }
//
// const copyViews = () => {
// 	return gulp.src("src/views/**/*")
// 		.pipe(gulp.dest("dist/views"));
// };
//
// const build = gulp.series(reset, copy_files, copyViews, scss, js, ckeditorBuild);
// const prod = gulp.series(
// 	reset,
// 	copy_files,
// 	copyViews,
// 	scssProd,
// 	ckeditorBuild,
// 	vueWidgetsProd,
// 	vueInstallStepperProd,
// 	vueMediamanagerProd,
// 	vueCatalogProd,
// 	jsProd
// );


// gulp.task('default', build);
// gulp.task('prod', prod);
gulp.task('ckeditorBuild', ckeditorBuild);
// gulp.task('copy-views', copyViews)
// gulp.task("copy-files", copy_files)
//
// gulp.task('js', js);
// gulp.task('jsProd', jsProd);
// gulp.task('styles-prod', scssProd);
// gulp.task('styles', gulp.series(scss, gulp.parallel(serve, watcher)));
//
// gulp.task('vue', gulp.series(vueWidgets, gulp.parallel(serve, vueWidgetsWatcher), gulp.parallel(serve, vueInstallStepperWatcher)));
// gulp.task('catalog', gulp.series(vueCatalog, gulp.parallel(serve, vueCatalogWatcher)));
// gulp.task('prodCat', vueCatalogProd);
// gulp.task('mm', gulp.series(vueMediamanager, gulp.parallel(serve, vueMMWatcher)));
// gulp.task('prodMediamanager', vueMediamanagerProd);
// gulp.task('vueInstallStepperProd', vueInstallStepperProd);
//
// export { build, prod, ckeditorBuild };
