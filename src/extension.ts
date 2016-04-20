'use strict';
import * as vscode from 'vscode';
import {Formatter} from './Formatter';

export function activate(context: vscode.ExtensionContext) {
    const formatter = new Formatter();

    const changeConfiguration = vscode.workspace.onDidChangeConfiguration(formatter.readSettings, formatter);
    context.subscriptions.push(changeConfiguration);

    const didSave = vscode.workspace.onDidSaveTextDocument(formatter.formatAuto, formatter);
    context.subscriptions.push(didSave);

    const commandTidyHtml = vscode.commands.registerTextEditorCommand('extension.tidyHtml', formatter.formatTextEditor, formatter);
    context.subscriptions.push(commandTidyHtml);

    return formatter;
}

export function deactivate() {
}
