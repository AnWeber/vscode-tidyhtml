'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {ISettings, Settings} from './Settings';
import {TidyWorker} from './TidyWorker';
import * as lodash from 'lodash';

export class Formatter {
    tidyWorker: TidyWorker;
    settings: ISettings;
    options: any;

    constructor() {
        this.settings = this.getSettings();
        this.options = this.getOptions();
    }

    getSettings(): ISettings {

        const config = vscode.workspace.getConfiguration('tidyHtml');

        const result = new Settings();
        result.tidyExecPath = config.get<string>('tidyExecPath');
        result.enableDynamicTags = config.get<boolean>('enableDynamicTags', true);
        result.optionsTidy = config.get<any>('optionsTidy');
        return result;
    }

    getOptions() {
        let options = this.settings.optionsTidy;
        if (vscode.workspace.rootPath) {
            const optionsFileName = path.join(vscode.workspace.rootPath, '.htmlTidy');
            if (fs.existsSync(optionsFileName)) {
                try {
                    const fileOptions = JSON.parse(fs.readFileSync(optionsFileName, 'utf8'));
                    options = fileOptions;
                } catch (err){
                    vscode.window.showWarningMessage('options in file .htmltidy not valid');
                }
            }
        }
        return options;
    }

    format() {
        const textEditor = vscode.window.activeTextEditor;
        if (textEditor) {
            const document = textEditor.document;
            const text = textEditor.document.getText();
            if (text && text.length > 0) {
                const options = lodash.merge(this.options, this._addUnknownTagsToNewBlockLevel(text));
                var worker = new TidyWorker(this.settings.tidyExecPath, options);
                return worker.formatAsync(text)
                    .then((formattedText) => {
                    const range = new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE);
                    let we = new vscode.WorkspaceEdit();
				we.replace(document.uri, range, formattedText);
				return vscode.workspace.applyEdit(we);
                    })
                    .catch((err) => {
                    console.log(err);
                    const errors = err.split('\n\r');
                    vscode.window.showWarningMessage(errors[0]);
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
    _addUnknownTagsToNewBlockLevel(text: string) :any {
        if (this.settings.enableDynamicTags) {
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
                    'new-blocklevel-tags' : blockLevelTags,
                };
            }
            return {};
        }
    }
}