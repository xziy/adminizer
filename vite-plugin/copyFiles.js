import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import {normalizePath} from "vite";

/**
 * Creates a symbolic link to a folder if it does not exist.
 * @param {string} source - Path to the folder that the link will point to.
 * @param {string} linkPath - Path where the symbolic link will be created.
 */
function createSymlinkIfNotExists(source, linkPath) {
    try {
        // Check if the target folder exists
        if (!fs.existsSync(source)) {
            console.log(chalk.red.bold(`[vite]: Target folder does not exist: ${source}`));
            return;
        }

        // Check if the link already exists
        if (fs.existsSync(linkPath)) {
            console.log(chalk.yellow.bold(`[vite]: Symbolic link already exists: ${linkPath}`));
            return;
        }

        // Check if the parent directory for the link exists
        const parentDir = path.dirname(linkPath);
        if (!fs.existsSync(parentDir)) {
            console.log(chalk.green.bold(`[vite]: Creating: ${parentDir}`));
            fs.mkdirSync(parentDir, {recursive: true});
        }

        // Create the symbolic link
        console.log(chalk.green.bold(`[vite]: Creating symbolic link: ${linkPath} -> ${source}`));
        fs.symlinkSync(source, linkPath, 'dir');
    } catch (err) {
        console.error(chalk.red.bold(`[vite]: Error creating symbolic link: ${err.message}`));
    }
}

/**
 * Copies a folder recursively.
 * @param {string} source - Path to the source folder.
 * @param {string} target - Path to the target folder.
 */
function copyFolderRecursiveSync(source, target) {
    try {
        // Check if the source folder exists
        if (!fs.existsSync(source)) {
            console.log(chalk.yellow.bold(`[vite]: Source folder does not exist: ${source}`));
            return;
        }

        // Check if the target folder exists
        if (!fs.existsSync(target)) {
            console.log(chalk.green.bold(`[vite]: Creating: ${target}`));
            fs.mkdirSync(target, {recursive: true});
        }

        // Read the contents of the source folder
        const files = fs.readdirSync(source);
        files.forEach(file => {
            const curSource = path.join(source, file);
            const curTarget = path.join(target, file);

            // Recursively copy each item
            const stats = fs.lstatSync(curSource);
            if (stats.isDirectory()) {
                copyFolderRecursiveSync(curSource, curTarget);
            } else {
                fs.copyFileSync(curSource, curTarget);
            }
        });
    } catch (err) {
        console.error(chalk.red.bold(`[vite]: Error copying folder: ${err.message}`));
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
    const isBuild = command === 'build'; // true if the build process is running

    const targetPath = normalizePath(path.resolve(import.meta.dirname, '../src/views')); // Path to the target folder
    const linkPath = normalizePath(path.resolve(import.meta.dirname, '../dist/views')); // Path to the symbolic link

    // Views ejs
    if (isDev) {
        // Development mode: create a symbolic link
        removeFolderIfExists(linkPath); // Delete the folder if it exists
        createSymlinkIfNotExists(targetPath, linkPath);
    } else if (isBuild) {
        // Build mode: remove the link and copy the folder
        removeFolderIfExists(linkPath); // Delete the folder if it exists
        copyFolderRecursiveSync(targetPath, linkPath);
    } else {
        console.error('Invalid mode.');
    }

    // other files
    copyFolderRecursiveSync(
        normalizePath(path.resolve(import.meta.dirname, '../src/assets/datatables')),
        normalizePath(path.resolve(import.meta.dirname, '../dist/assets/datatables'))
    )
    removeFolderIfExists(path.resolve(import.meta.dirname, '../dist/translations'))
    copyFolderRecursiveSync(
        normalizePath(path.resolve(import.meta.dirname, '../src/translations')),
        normalizePath(path.resolve(import.meta.dirname, '../dist/translations'))
    )
    removeFolderIfExists(path.resolve(import.meta.dirname, '../dist/migrations'))
    copyFolderRecursiveSync(
        normalizePath(path.resolve(import.meta.dirname, '../src/migrations')),
        normalizePath(path.resolve(import.meta.dirname, '../dist/migrations'))
    )
}
