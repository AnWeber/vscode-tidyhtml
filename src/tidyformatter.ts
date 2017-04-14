'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TidyWorker } from './tidyworker';
import { TidyResult } from './tidyresult';
import * as lodash from 'lodash';

/**
 * format manager
 */
export class TidyFormatter implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    private tidyWorker: TidyWorker;
    private config: any;
    private tidySettings: any;
    private tidyExec: string;

    constructor() {
        this.readSettings();
    }
    /**
     * refresh config
     */
    readSettings() {
        this.config = vscode.workspace.getConfiguration('tidyHtml');
        this.tidySettings = null;
        this.tidyExec = null;
    }


    /**
     *  format the document of the textEditor
     * @param {TextEditor} textEditor active TextEditor
     */
    formatTextEditor(textEditor: vscode.TextEditor) {
        const score = vscode.languages.match('html', textEditor.document);
        console.log(score);
        this.format(textEditor.document)
            .then(textedits => {
                let we = new vscode.WorkspaceEdit();
                textedits.forEach(edit => {
                    we.replace(textEditor.document.uri, edit.range, edit.newText);
                });
                return vscode.workspace.applyEdit(we);
            });
    }

    /**
    *  check if auto format is enabled and format the document
    * @param {TextDocument} document the document to format
    */
    formatAuto(event: vscode.TextDocumentWillSaveEvent) {
        const document = event.document;
        if (this.config.formatOnSave) {
            let formatDocument = false;
            const extName = path.extname(document.uri.toString());
            if (this.config.formatOnSave === true) {
                formatDocument = extName === '.html';
            } else if (this.config.formatOnSave.indexOf && this.config.formatOnSave.indexOf(extName) >= 0) {
                formatDocument = true;
            }
            if (formatDocument) {
                event.waitUntil(this.format(document));
            }
        }
    }


    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken) {
        return this.format(document);
    }

    provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken) {
        return this.format(document);
    }

    /**
     *  format the content of the document
     * @param {TextDocument} document the document to format
     */
    format(document: vscode.TextDocument) {
        const text = document.getText();
        if (text && text.length > 0) {
            const settings = lodash.merge(this._getTidySettings(), this._addUnknownTagsToNewBlockLevel(text));
            const tidyExecPath = this._getTidyExec();
            if (tidyExecPath) {
                var worker = new TidyWorker(tidyExecPath, settings);
                return worker.formatAsync(text)
                    .then((result: TidyResult) => {
                        this._showMessage(result);

                        if (result.isError || this.config.stopOnWarning && result.isWarning) {
                            return null;
                        }
                        const range = new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE);
                        return [new vscode.TextEdit(range, result.value)];
                    })
                    .catch((err: Error) => {
                        vscode.window.showErrorMessage(err.message);
                    });
            }
        }
    }

    private _showMessage(result: TidyResult) {
        if (result.error && (result.isError || result.isWarning)) {
            console.log(result.error);
            let notificationType = this.config.errorNotification;
            if (result.isWarning) {
                notificationType = this.config.warningNotification;
            }
            if (notificationType === 'statusbar') {
                vscode.window.setStatusBarMessage(result.error.message, 5000);
                return true;
            } else if (notificationType === 'message') {
                vscode.window.showErrorMessage(result.error.message);
                return true;
            }
        }
        return false;
    }

    /**
     * get options from workspace options or from file .htmltidy
     */
    _getTidySettings() {
        if (!this.tidySettings) {
            let options = this.config.optionsTidy;
            if (vscode.workspace.rootPath) {
                const optionsFileName = path.join(vscode.workspace.rootPath, '.htmlTidy');
                if (fs.existsSync(optionsFileName)) {
                    try {
                        const fileOptions = JSON.parse(fs.readFileSync(optionsFileName, 'utf8'));
                        options = fileOptions;
                    } catch (err) {
                        vscode.window.showWarningMessage('options in file .htmltidy not valid');
                    }
                }
            }
            this.tidySettings = options;
        }
        return this.tidySettings;
    }
    /**
    * filename of the tidy html 5 executable
    *
    * @returns filename
    */
    _getTidyExec() {
        if (!this.tidyExec) {
            this.tidyExec = this.config.tidyExecPath;
            if (!this.tidyExec || !fs.existsSync(this.tidyExec)) {
                if (this.tidyExec) {
                    vscode.window.showWarningMessage(`configured tidy executable is missing. Fallback to default`);
                }
                this.tidyExec = `${__dirname}/../../tidy/${process.platform}/tidy`;
                if (process.platform === 'win32') {
                    this.tidyExec += '.exe';
                }
                if (!fs.existsSync(this.tidyExec)) {
                    this.tidyExec = null;
                    vscode.window.showWarningMessage(`Unsupported platform ${process.platform}. Please configure own tidy executable.`);
                }
            }
        }
        return this.tidyExec;
    }

    /**
     * add tags with - to tidy html 5 new block level tags
     *
     * @param {string} text current text
     * @param {object} options tidy html 5 options
     */
    _addUnknownTagsToNewBlockLevel(text: string): any {
        if (this.config.enableDynamicTags) {
            var elements = text.split('<');

            var blockLevelTags = lodash(elements)
                .map((obj) => obj.trim().split(' ')[0])
                .filter((obj) => !obj.startsWith('/') && !obj.startsWith('!'))
                .filter((obj) => obj.indexOf('-') > 0)
                .uniq()
                .join();
            var existingBlockLevelTags = this._getTidySettings()['new-blocklevel-tags'];
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