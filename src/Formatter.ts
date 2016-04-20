'use strict';
import {window, workspace, WorkspaceEdit, Range, TextDocument, TextEditor} from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {TidyWorker} from './TidyWorker';
import * as lodash from 'lodash';

export class Formatter {
    private tidyWorker: TidyWorker;
    private config: any;
    private options: any;

    constructor() {
        this.readSettings();
        this.options = this.getOptions();
    }

    readSettings() {
        this.config = workspace.getConfiguration('tidyHtml');
    }

    getOptions() {
        let options = this.config.optionsTidy;
        if (workspace.rootPath) {
            const optionsFileName = path.join(workspace.rootPath, '.htmlTidy');
            if (fs.existsSync(optionsFileName)) {
                try {
                    const fileOptions = JSON.parse(fs.readFileSync(optionsFileName, 'utf8'));
                    options = fileOptions;
                } catch (err) {
                    window.showWarningMessage('options in file .htmltidy not valid');
                }
            }
        }
        return options;
    }

    formatTextEditor(textEditor: TextEditor) {
        this.format(textEditor.document);
    }

    formatAuto(document: TextDocument) {
        if (this.config.formatOnSave) {
            let formatDocument = false;
            const extName = path.extname(document.uri.toString());
            if (this.config.formatOnSave === true) {
                formatDocument = extName === '.html';
            } else if (this.config.formatOnSave.indexOf && this.config.formatOnSave.indexOf(extName) >= 0) {
                formatDocument = true;
            }
            if (formatDocument) {
                this.format(document);
            }
        }
    }

    format(document: TextDocument) {
        if (document) {
            const text = document.getText();
            if (text && text.length > 0) {
                const options = lodash.merge(this.options, this.addUnknownTagsToNewBlockLevel(text));
                var worker = new TidyWorker(this.config.tidyExecPath, options);
                return worker.formatAsync(text)
                    .then((formattedText) => {
                        const range = new Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE);
                        let we = new WorkspaceEdit();
                        we.replace(document.uri, range, formattedText);
                        return workspace.applyEdit(we);
                    })
                    .catch((err) => {
                        console.log(err);
                        const errors = err.split('\n\r');
                        window.showWarningMessage(errors[0]);
                    });
            }
        }
    }

    /**
     * add tags with - to tidy html 5 new block level tags
     *
     * @param {string} text current text
     * @param {object} options tidy html 5 options
     */
    addUnknownTagsToNewBlockLevel(text: string): any {
        if (this.config.enableDynamicTags) {
            var elements = text.split('<');

            var blockLevelTags = lodash(elements)
                .map((obj) => obj.trim().split(' ')[0])
                .filter((obj) => !obj.startsWith('/') && !obj.startsWith('!'))
                .filter((obj) => obj.indexOf('-') > 0)
                .uniq()
                .join();
            var existingBlockLevelTags = this.options['new-blocklevel-tags'];
            if (existingBlockLevelTags) {
                blockLevelTags = existingBlockLevelTags + ' ' + blockLevelTags;
            }
            if (blockLevelTags.length > 0) {
                return {
                    'new-blocklevel-tags': blockLevelTags,
                };
            }
            return {};
        }
    }
}