'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TidyWorker } from './tidyworker';
import { TidyResult } from './tidyresult';
import { Configuration } from './configuration';

/**
 * format manager
 */
export class TidyFormatter implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    private config: Configuration;
    private tidySettings: any;
    private tidyExec: string;

    constructor() {
        this.readSettings();
    }
    /**
     * refresh config
     */
    readSettings() {
        this.config = vscode.workspace.getConfiguration('tidyHtml') as Configuration;
        this.tidySettings = null;
        this.tidyExec = null;
    }


    /**
     *  format the document of the textEditor
     * @param {TextEditor} textEditor active TextEditor
     */
    formatTextEditor(textEditor: vscode.TextEditor) {
        this.format(textEditor.document)
            .then(textedits => {
                if (textedits) {
                    let we = new vscode.WorkspaceEdit();
                    textedits.forEach(edit => {
                        we.replace(textEditor.document.uri, edit.range, edit.newText);
                    });
                    return vscode.workspace.applyEdit(we);
                }
                return null;
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

    provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions, _token: vscode.CancellationToken) {
        return this.format(document);
    }

    provideDocumentRangeFormattingEdits(document: vscode.TextDocument, _range: vscode.Range, _options: vscode.FormattingOptions, _token: vscode.CancellationToken) {
        return this.format(document);
    }

    /**
     *  format the content of the document
     * @param {TextDocument} document the document to format
     */
    format(document: vscode.TextDocument) {
        try {
            const text = document.getText();
            if (text && text.length > 0) {
                const settings = Object.assign({}, this.getTidySettings());
                this.addUnknownTagsToNewBlockLevel(settings, text);
                if (this.config.traceLogging) {
                    console.info(`settings: ${settings}`);
                }
                const tidyExecPath = this.getTidyExec();
                if (tidyExecPath) {
                    const worker = new TidyWorker(tidyExecPath, settings);
                    if (this.config.traceLogging) {
                        worker.traceLogging = this.config.traceLogging;
                    }
                    return worker.formatAsync(text)
                        .then((result: TidyResult) => {
                                if (this.config.traceLogging) {
                                    console.info(result);
                                }
                                this.showMessage(result);
                                if (result.isError || this.config.stopOnWarning && result.isWarning) {
                                    return null;
                                }
                                const range = new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE);
                                return [new vscode.TextEdit(range, result.value)];
                        })
                        .catch((err: Error) => {
                            console.error(err);
                            vscode.window.showErrorMessage(err.message);
                        });
                } else if (this.config.traceLogging) {
                    console.info('no tidy executable found');
                }
            } else if (this.config.traceLogging) {
                console.info('no text');
            }
        } catch (err) {
            console.error(err);
            vscode.window.showErrorMessage(err.message);
        }
        return Promise.resolve<vscode.TextEdit[]>(null);
    }

    private showMessage(result: TidyResult) {
        if (result.error && (result.isError || result.isWarning)) {
            if (this.config.traceLogging) {
                console.error(result);
            }
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
    private getTidySettings() {
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
    private getTidyExec() {
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
    private addUnknownTagsToNewBlockLevel(settings: any, text: string): any {
        if (this.config.enableDynamicTags) {
            const elements = text.split('<');

            let blockLevelTags = elements
                .map((obj) => obj.trim().split(' ')[0])
                .filter((obj) => !obj.startsWith('/') && !obj.startsWith('!'))
                .filter((obj) => obj.indexOf('-') > 0)
                .filter((obj, index, self) => self.indexOf(obj) === index)
                .join();
            const existingBlockLevelTags = settings['new-blocklevel-tags'];
            if (existingBlockLevelTags) {
                blockLevelTags = existingBlockLevelTags + ' ' + blockLevelTags;
            }
            if (blockLevelTags.length > 0) {
                settings['new-blocklevel-tags'] = blockLevelTags;
            }
        }
    }

}