'use strict';
import {window, workspace, WorkspaceEdit, Range, TextDocument, TextEditor} from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {TidyWorker} from './TidyWorker';
import * as lodash from 'lodash';

/**
 * format manager
 */
export class Formatter {
    private tidyWorker: TidyWorker;
    private config: any;
    private options: any;
    private autoFormatDocument: TextDocument;

    constructor() {
        this.readSettings();
        this.options = this.getOptions();
    }
    /**
     * refresh config
     */
    readSettings() {
        this.config = workspace.getConfiguration('tidyHtml');
    }

    /**
     * get options from workspace options or from file .htmltidy
     */
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

    /**
     *  format the document of the textEditor
     * @param {TextEditor} textEditor active TextEditor
     */
    formatTextEditor(textEditor: TextEditor) {
        this.format(textEditor.document);
    }

    /**
     *  check if auto format is enabled and format the document
     * @param {TextDocument} document the document to format
     */
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
                //if the formattedtext is saved, the next autoformat is called. to break out the loop the last autoformat document is saved
                if (this.autoFormatDocument === document) {
                    this.autoFormatDocument = null;
                    return;
                }
                this.autoFormatDocument = document;
                this.format(document);
            }
        }
    }
    /**
     *  format the content of the document
     * @param {TextDocument} document the document to format
     */
    format(document: TextDocument) {
        if (document) {
            const text = document.getText();
            if (text && text.length > 0) {
                const options = lodash.merge(this.options, this.addUnknownTagsToNewBlockLevel(text));
                const tidyExecPath = this.getTidyExec();
                if (tidyExecPath) {
                    var worker = new TidyWorker(tidyExecPath, options);
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
    }

    /**
    * filename of the tidy html 5 executable
    *
    * @returns filename
    */
    getTidyExec() {
        let tidyExec = this.config.tidyExecPath;
        if (tidyExec) {
            if (fs.existsSync(tidyExec)) {
                return tidyExec;
            } else {
                window.showWarningMessage(`configured tidy executable is missing. Fallback to default`);
            }
        }
        tidyExec = `${__dirname}/../../tidy/${process.platform}/tidy`;
        if (process.platform === 'win32') {
            tidyExec += '.exe';
        }
        if (fs.existsSync(tidyExec)) {
            return tidyExec;
        }
        window.showWarningMessage(`Unsupported platform ${process.platform}. Please configure own tidy executable.`);
        return null;
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