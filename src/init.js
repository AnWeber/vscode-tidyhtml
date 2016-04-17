'use babel';

import { CompositeDisposable } from 'atom';
import configJson from './config.json';
import lodash from 'lodash';
import EditorHandler from './editorHandler';
import fs from 'fs';

/**
 * extensions for formattiong html content
 */
class HtmlTidy {
  constructor() {
    this.config = configJson;
  }
  /**
   * activate extensions
   */
  activate() {
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.config.observe('atom-htmltidy', (value) => {
        this.isValid = false;
        this.settings = value;
        this.settings.tidyExec = this._fileNameOfTidyExecutable();

        this.grammarScopes = lodash.map(this.settings.grammarScopes, (grammar) => {
          if (grammar.indexOf('.') >= 0) {
            return grammar;
          }
          return `text.html.${grammar}`;
        });

        if (this.settings.tidyExec) {
          this.isValid = true;
        }
        this._observeTextEditors();
      })
    );

    this.disposables.add(
      atom.commands.add('atom-workspace', 'atom-htmltidy:format', () => {
        if (this.isValid) {
          const textEditor = atom.workspace.getActiveTextEditor();
          if (textEditor) {
            const editorHandler = this._watchTextEditor(textEditor);
            if (editorHandler) {
              editorHandler.format(false);
            } else {
              atom.notifications.addWarning('atom-htmltidy', {
                detail: `grammar ${textEditor.getGrammar().scopeName} is not supported`
              });
            }
          }
        }
      })
    );

    this.disposables.add(
      atom.commands.add('atom-workspace', 'atom-htmltidy:toggleAutoSave', () => {
        atom.config.set('atom-htmltidy.formatOnSave', !this.settings.formatOnSave);
      })
    );
  }

  deactivate() {
    this._dispose();
    this.disposables.dispose();
  }

  /**
   * attach EditorHandler for open TextEditor
   */
  _observeTextEditors() {
    if (this.settings.formatOnSave && this.isValid) {
      if (!this.observeDisposable) {
        lodash.forEach(atom.workspace.getTextEditors(), (textEditor) => {
          this._watchTextEditor(textEditor);
        });
        this.observeDisposable = atom.workspace.observeTextEditors(textEditor => {
          this._watchTextEditor(textEditor);
        });
      }
      if (this.editorHandlers) {
        lodash.forEach(this.editorHandlers, (handler) => handler.refresh(this.settings));
      }
    } else {
      this._dispose();
    }
  }
  /**
   * dispose all observers
   */
  _dispose() {
    if (this.editorHandlers) {
      lodash.forEach(this.editorHandlers, (handler) => handler.dispose());
      this.editorHandlers = null;
    }
    if (this.observeDisposable) {
      this.observeDisposable.dispose();
      this.observeDisposable = null;
    }
  }
  /**
   * attach handler for texteditor
   * @param  {TextEditor} textEditor current texteditor
   * @return {EditorHandler}         der erzeugte Handler
   */
  _watchTextEditor(textEditor) {
    const isSupported = this.grammarScopes.indexOf(textEditor.getGrammar().scopeName) >= 0;
    if (isSupported) {
      if (!this.editorHandlers) {
        this.editorHandlers = {};
      }
      const contentPath = textEditor.getPath();
      let editorHandler = this.editorHandlers[contentPath];
      if (!editorHandler) {
        editorHandler = new EditorHandler(textEditor,
          this.settings,
          () => {
            this.editorHandlers[contentPath] = null;
            delete this.editorHandlers[contentPath];
          });

        this.editorHandlers[contentPath] = editorHandler;
      }
      return editorHandler;
    }
  }

  /**
   * filename of the tidy html 5 executable
   *
   * @returns filename
   */
  _fileNameOfTidyExecutable() {
    var tidyExec = this.settings.tidyExecPath;
    if (tidyExec) {
      if (fs.existsSync(tidyExec)) {
        return tidyExec;
      } else {
        atom.notifications.addWarning('atom-htmltidy', {
          detail: `configured tidy executable is missing. Fallback to default`
        });
      }

    }
    tidyExec = `${__dirname}/bin/${process.platform}/tidy`;
    if (process.platform === 'win32') {
      tidyExec += '.exe';
    }
    if (fs.existsSync(tidyExec)) {
      return tidyExec;
    }
    atom.notifications.addWarning('atom-htmltidy', {
      detail: `Unsupported platform ${process.platform}. Please configure own tidy executable.`
    });
    return null;
  }
  provideLinter() {
    const regex = /line (\d+) column (\d+) - (Warning|Error): (.+)/g;

    return {
      regex: regex,
      grammarScopes: this.grammarScopes,
      name: 'htmltidy',
      scope: 'file',
      lintOnFly: true,
      lint: (textEditor) => {
        if (!this.settings.enableLinter) {
          return [];
        }
        const filePath = textEditor.getPath();
        const editorHandler = this._watchTextEditor(textEditor);
        if (editorHandler) {
          const text = textEditor.getText();
          return editorHandler.errors().then((errors) => {
            const messages = [];
            if (errors && text === textEditor.getText()) {
              let match = regex.exec(errors);
              while (match !== null) {
                const line = match[1] - 1;
                const col = match[2] - 1;

                const range = this.rangeFromLineNumber(textEditor, line, col);
                messages.push({
                  type: match[3],
                  text: match[4],
                  range: range,
                  filePath,
                });
                match = regex.exec(errors);
              }
            }
            return messages;
          });
        }
      }
    };

  }

  rangeFromLineNumber(textEditor, lineNumber, colStart) {
    const buffer = textEditor.getBuffer();
    const lineMax = buffer.getLineCount() - 1;
    let result = null;
    if (lineNumber <= lineMax) {
      const lineLength = buffer.lineLengthForRow(lineNumber);
      result = [[lineNumber, Math.min(colStart, lineLength)], [lineNumber, lineLength]];
    }
    return result;
  }
}

export default new HtmlTidy();
