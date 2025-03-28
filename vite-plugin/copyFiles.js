import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import {normalizePath} from "vite";

/**
 * Syncs a folder or file from source to target.
 * @param source
 * @param target
 * @param dev
 * @returns {string}
 */
function syncFolderOrFile(source, target, dev = true) {
    try {
        // Check if the source (file or folder) exists
        if (!fs.existsSync(source)) {
            console.log(chalk.red.bold(`[vite]: Source does not exist: ${source}`));
            return '';
        }

        const isSourceDirectory = fs.lstatSync(source).isDirectory();

        // Ensure the parent directory exists
        const parentDir = path.dirname(target);
        if (!fs.existsSync(parentDir)) {
            console.log(chalk.green.bold(`[vite]: Creating parent directory: ${parentDir}`));
            fs.mkdirSync(parentDir, { recursive: true });
        }

        if (isSourceDirectory) {
            // Logic for folders
            if (dev) {
                // Dev mode: handle symbolic link or folder
                if (fs.existsSync(target)) {
                    const stats = fs.lstatSync(target);

                    if (stats.isDirectory()) {
                        // If it's a folder, remove it
                        console.log(chalk.yellow.bold(`[vite]: Removing existing folder: ${target}`));
                        fs.rmSync(target, { recursive: true, force: true });

                        // Create a symbolic link
                        console.log(chalk.green.bold(`[vite]: Creating symbolic link: ${target} -> ${source}`));
                        fs.symlinkSync(source, target, 'dir');
                    } else if (stats.isSymbolicLink()) {
                        // If it's a symbolic link, do nothing
                        console.log(chalk.yellow.bold(`[vite]: Symbolic link already exists: ${target}`));
                        return '';
                    }
                } else {
                    // If nothing exists, create a symbolic link
                    console.log(chalk.green.bold(`[vite]: Creating symbolic link: ${target} -> ${source}`));
                    fs.symlinkSync(source, target, 'dir');
                }
            } else {
                // Non-dev mode: remove both folder and link, then copy the source folder
                if (fs.existsSync(target)) {
                    console.log(chalk.yellow.bold(`[vite]: Removing existing target: ${target}`));
                    fs.rmSync(target, { recursive: true, force: true });
                }

                // Create the target folder
                console.log(chalk.green.bold(`[vite]: Creating target folder: ${target}`));
                fs.mkdirSync(target, { recursive: true });

                // Copy the contents of the source folder to the target folder
                const files = fs.readdirSync(source);
                files.forEach(file => {
                    const curSource = path.join(source, file);
                    const curTarget = path.join(target, file);

                    const stats = fs.lstatSync(curSource);
                    if (stats.isDirectory()) {
                        syncFolderOrFile(curSource, curTarget, dev); // Recursively copy directories
                    } else {
                        console.log(chalk.green.bold(`[vite]: Copying file: ${curSource} -> ${curTarget}`));
                        fs.copyFileSync(curSource, curTarget);
                    }
                });
            }
        } else {
            // Logic for files: always copy
            if (fs.existsSync(target)) {
                console.log(chalk.yellow.bold(`[vite]: Removing existing file: ${target}`));
                fs.rmSync(target, { force: true });
            }

            // Copy the file
            console.log(chalk.green.bold(`[vite]: Copying file: ${source} -> ${target}`));
            fs.copyFileSync(source, target);
        }
    } catch (err) {
        console.error(chalk.red.bold(`[vite]: Error: ${err.message}`));
    }
}

/**
 * Deletes a folder if it exists and is not a symbolic link.
 * @param {string} folderPath - Path to the folder.
 */
function removeFolderIfExists(folderPath) {
    try {
        if (fs.existsSync(folderPath)) {
            const stats = fs.lstatSync(folderPath);
            if (stats.isDirectory() && !stats.isSymbolicLink()) {
                console.log(chalk.yellow.bold(`[vite]: Deleting folder: ${folderPath}`));
                fs.rmSync(folderPath, {recursive: true, force: true});
            }
        }
    } catch (err) {
        console.error(chalk.red.bold(`[vite]: Error deleting folder: ${err.message}`));
    }
}

export function copyFiles(command) {
    const isDev = command === 'serve'; // true if the dev server is running

    if(!isDev) {
        // Clear the assets folder
        removeFolderIfExists(normalizePath(path.resolve(import.meta.dirname, '../dist/assets')))
    }

    const sources = [
        {
            source: '../src/views',
            destination: '../dist/views',
        },
        {
            source: '../src/assets/datatables',
            destination: '../dist/assets/datatables',
        },
        {
            source: '../src/translations',
            destination: '../dist/translations'
        },
        {
            source: '../src/migrations',
            destination: '../dist/migrations'
        },
        {
            source: '../node_modules/handsontable/dist/languages',
            destination: '../dist/assets/handsontable'
        },
        {
            source: '../src/assets/ckeditor5',
            destination: '../dist/assets/ckeditor5'
        },
        {
            source: '../node_modules/jquery/dist/jquery.min.js',
            destination: '../dist/assets/jquery/jquery.min.js'
        },
        {
            source: '../node_modules/jquery-ui-dist/jquery-ui.min.js',
            destination: '../dist/assets/jquery/jquery-ui.min.js'
        },
        {
            source: '../node_modules/ace-builds/src-min-noconflict',
            destination: '../dist/assets/ace'
        },
        {
            source: '../node_modules/jsoneditor/dist/jsoneditor.min.js',
            destination: '../dist/assets/jsoneditor/jsoneditor.min.js'
        },
    ];

    for (const source of sources) {
        const targetPath = normalizePath(path.resolve(import.meta.dirname, source.source)); // Path to the target folder
        const linkPath = normalizePath(path.resolve(import.meta.dirname, source.destination)); // Path to the symbolic link
        syncFolderOrFile(targetPath, linkPath, isDev);
    }
}
