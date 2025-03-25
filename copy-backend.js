import shell from 'shelljs';
import path from 'path';
import chalk from 'chalk';

const CONFIG = {
    sourceDir: path.normalize('src'),
    targetDir: path.normalize('dist'),
    foldersToCopy: ['migrations'],
    // filesToCopy: ['*.json', '*.yaml']
};


function cleanTargetDirectory() {
    try {
        if (shell.test('-d', CONFIG.targetDir)) {
            shell.rm('-rf', path.join(CONFIG.targetDir, '*'));
            console.log(chalk.yellow('Target directory cleaned successfully'));
        } else {
            console.log(chalk.yellow('Target directory does not exist, skipping cleanup'));
        }
    } catch (err) {
        console.log(chalk.red(`Failed to clean target directory: ${err.message}`));
        process.exit(1);
    }
}

function copyResources() {
    try {
        const { sourceDir, targetDir, foldersToCopy } = CONFIG;

        shell.mkdir('-p', targetDir);

        foldersToCopy.forEach(folder => {
            const source = path.join(sourceDir, folder);
            if (shell.test('-d', source)) {
                shell.cp('-R', source, targetDir);
                console.log(chalk.green(`Copied: ${chalk.bold(folder)} → ${path.join(targetDir, folder)}`));
            } else {
                console.log(chalk.yellow(`Source folder not found: ${source}`));
            }
        });

        console.log(chalk.green('Copy process completed!'));
    } catch (err) {
        console.log(chalk.red(`Copy process failed: ${err.message}`));
        process.exit(1);
    }
}

try {
    cleanTargetDirectory();
    copyResources();
} catch (err) {
    console.log(chalk.red(`Script execution failed: ${err.message}`));
    process.exit(1);
}
