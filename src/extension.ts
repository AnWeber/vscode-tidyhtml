'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import {Formatter} from './Formatter';



export function activate(context: vscode.ExtensionContext) {

    const formatter = new Formatter();


    let disposable = vscode.commands.registerCommand('extension.tidyHtml', () => {
        formatter.format();
    });

    context.subscriptions.push(disposable);
}



export function deactivate() {
}