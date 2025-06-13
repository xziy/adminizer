import shell from 'shelljs';
import path from 'path';
import chalk from 'chalk';

const CONFIG = {
    filesToCopy: [
        'modules/controls/wysiwyg/react-quill-editor.es.js',
        'modules/controls/wysiwyg/react-quill-editor.css',
        'modules/test/ComponentB.es.js',
        'modules/testCatalog/button-Dk9HuYNn.js',
        'modules/testCatalog/catalogAction.es.js',
        'modules/testCatalog/Group.es.js'
    ],
    targetDir: path.normalize('dist/assets/modules')
};

function copyFiles() {
    try {
        shell.mkdir('-p', CONFIG.targetDir);

        CONFIG.filesToCopy.forEach(file => {
            const sourceFile = path.normalize(file);
            const targetFile = path.join(CONFIG.targetDir, path.basename(file));

            if (shell.test('-f', sourceFile)) {
                shell.cp(sourceFile, targetFile);
                console.log(chalk.green(`Copied: ${chalk.bold(sourceFile)} → ${targetFile}`));
            } else {
                console.log(chalk.yellow(`Source file not found: ${sourceFile}`));
            }
        });

        console.log(chalk.green('Copy process completed!'));
    } catch (err) {
        console.log(chalk.red(`Copy process failed: ${err.message}`));
        process.exit(1);
    }
}

try {
    copyFiles();
} catch (err) {
    console.log(chalk.red(`Script execution failed: ${err.message}`));
    process.exit(1);
}
