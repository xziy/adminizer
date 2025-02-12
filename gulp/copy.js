import {promisify} from "util";
import fs from "fs";
import path from "path";
import gulp from "gulp";

const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const copyFiles = async (src, dest) => {
  try {
    const entryStat = await stat(src);

    if (entryStat.isFile()) {
      await mkdir(path.dirname(dest), { recursive: true });
      await copyFile(src, dest);

    } else {
      await mkdir(dest, { recursive: true });
      const entries = await readdir(src);

      for (const entry of entries) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        await copyFiles(srcPath, destPath);
      }
    }

  } catch (err) {
    console.error(`Error copying ${src} -> ${dest}:`, err);
  }
};

const copy_jsoneditor = async () => {
  await copyFiles('./node_modules/jsoneditor/src/scss/img', './dist/assets/style/img');
};

const copy_line_awesome = async () => {
  await copyFiles('./node_modules/line-awesome/dist/line-awesome/fonts', './dist/assets/fonts');
};

const copy_ace_builds = async () => {
  await copyFiles('./node_modules/ace-builds/src-min-noconflict', './dist/assets/js/ace');
};

const copy_jsoneditor_min = async () => {
  await copyFiles('./node_modules/jsoneditor/dist/jsoneditor.min.js', './dist/assets/js/jsoneditor/jsoneditor.min.js');
};

const copy_leaflet_draw = async () => {
  await copyFiles('./node_modules/leaflet-draw/dist/images', './dist/assets/style/images');
};

const copy_ckeditor = async () => {
  await copyFiles('./src/assets/src/scripts/ckeditor5', './dist/assets/js/ckeditor5');
};

const copy_datatables = async () => {
  await copyFiles('./src/assets/datatables', './dist/assets/datatables');
};

const copy_migrations = async () => {
  await copyFiles('./src/migrations', './dist/migrations');
};

const copy_translations = async () => {
  await copyFiles('./src/translations', './dist/translations');
};

const copy_handsontable = async () => {
  await copyFiles('./node_modules/handsontable/dist/languages', './dist/assets/handsontable/dist/languagesinit');
};

export const copy_files = gulp.parallel(
  copy_jsoneditor,
  copy_line_awesome,
  copy_ace_builds,
  copy_jsoneditor_min,
  copy_leaflet_draw,
  copy_ckeditor,
  copy_datatables,
  copy_migrations,
  copy_translations,
  copy_handsontable
);
