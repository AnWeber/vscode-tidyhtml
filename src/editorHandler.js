'use babel';

import OptionsHandler from './optionsHandler';
import TidyWorker from './tidyWorker';
import lodash from 'lodash';

/**
 * handle TextEditor content
 */
class EditorHandler {
  constructor(textEditor, settings, disposeCallback) {
    this.textEditor = textEditor;
    this.refresh(settings);
    this.textEditor.onDidDestroy(() => {
      this.dispose();
      if (disposeCallback) {
        disposeCallback();
      }
    });
  }
  /**
   * dispose this handler
   */
  dispose() {
    this.disposed = true;
    this._disposeSaveWatcher();
    this.textEditor = null;
    this.settings = null;
  }
  /**
   * refresh the used settings
   * @param  {object} settings the atom settings for this extension
   */
  refresh(settings) {
    this.settings = settings;
    this._handleFormatOnSave();
    this.optionsHandler = null;
  }

  /**
   * detach watcher on willSave
   */
  _disposeSaveWatcher() {
    if (this.saveWatcher) {
      this.saveWatcher.dispose();
      this.saveWatcher = null;
    }
  }
  /**
   * attach watcher on willSave
   */
  _handleFormatOnSave() {
    if (this.settings.formatOnSave) {
      if (!this.saveWatcher) {
        this.saveWatcher = this.textEditor.getBuffer().onWillSave(() => this.format(true));
      }
    } else {
      this._disposeSaveWatcher();
    }
  }

  /**
   * initialize optionsHandler
   */
  _initialize() {
    if (!this.optionsHandler) {
      this.optionsHandler = new OptionsHandler(this.settings);
      this.defaultOptions = this.optionsHandler.loadOptions(this.textEditor.getPath()) || {};
    }
  }

  /**
   * format content of textEditor
   *
   * @param {boolean} saveFormat should the editor get saved
   */
  format(saveFormat) {
    this._initialize();
    var text = this.textEditor.getText();
    if (text && text.length > 0) {
      const options = lodash.merge(this.defaultOptions, this.optionsHandler.loadDynamicOptions(text));
      var worker = new TidyWorker(this.settings.tidyExec, options);
      return worker.formatAsync(text).then((formattedText) => {
        if (!this.disposed) {
          if (formattedText && formattedText.length > 0) {
            this._setText(formattedText);
            this._checkSecureTagCount(text, formattedText);
            if (saveFormat) {
              this._save();
            }
          }
        }
        return formattedText;
      }, (err) => {
        console.log(err);
        const errors = err.split('\n\r');
        atom.notifications.addWarning('atom-htmltidy', {
          detail: errors[0]
        });
      });
    }
  }

  /**
   * ermittle die Liste der Fehler für den aktuellen Editor
   * @return {promise} ein Promise
   */
  errors() {
    this._initialize();
    var text = this.textEditor.getText();
    if (text && text.length > 0) {
      const options = lodash.merge(this.defaultOptions, this.optionsHandler.loadDynamicOptions(text));
      var worker = new TidyWorker(this.settings.tidyExec, options);
      return worker.errors(text);
    }
    return Promise.resolve(null);
  }

  /**
   * check tag count before and after formatting
   * @param  {string} text          content before formatting
   * @param  {string} formattedText content after formatting
   */
  _checkSecureTagCount(text, formattedText) {
    if (this.settings.secureTagCount) {
      let oldTagCount = text.split('<').length;
      let newTagCount = formattedText.split("<").length;
      if (oldTagCount !== newTagCount) {
        var message = `${oldTagCount - newTagCount} tags missing.`;
        if (oldTagCount < newTagCount) {
          message = `${newTagCount - oldTagCount} tags added.`;
        }
        atom.notifications.addWarning('atom-htmltidy: tag count changed', {
          detail: message
        });
      }
    }
  }

  /**
   * set new content in textEditor
   *
   * @param text text to set in textEditor
   */
  _setText(text) {
    const textEditorEl = atom.views.getView(this.textEditor);
    const cursorPosition = this.textEditor.getCursorBufferPosition();
    const line = textEditorEl.getFirstVisibleScreenRow() + this.textEditor.displayBuffer.getVerticalScrollMargin();

    this.textEditor.setText(text);

    this.textEditor.setCursorBufferPosition(cursorPosition);

    if (this.textEditor.getScreenLineCount() > line) {
      this.textEditor.scrollToScreenPosition([line, 0]);
    }
  }

  /**
   * save content to editor
   */
  _save() {
    this._disposeSaveWatcher();
    this.textEditor.save();
    this._handleFormatOnSave();
  }
}
export default EditorHandler;
