'use babel';

import path from 'path';
import fs from 'fs';
import lodash from 'lodash';

/**
 * handle access to tidy html options
 */
class OptionsHandler {

  constructor(settings) {
    this.settings = settings;
  }
  /**
   * get options for a file
   *
   * @param {string} filename filename
   * @returns {object} tidy html 5 options
   */
  loadOptions(filename) {
    let jsonString;
    if (this.settings.fileSearchEnabled) {
      jsonString = this._readFile(path.dirname(filename), this.settings.fileSearchFilename || '.htmltidy');
    }
    if (!jsonString) {
      jsonString = this.settings.optionsTidy;
    }

    if (jsonString) {
      return JSON.parse(jsonString);
    }

    return null;
  }

  /**
   * find file and read contents
   *
   * @param {string} directory current directory
   * @param {string} name filename to search for
   * @returns {string} filename
   */
  _readFile(directory, name) {
    const chunks = directory.split(path.sep);

    while (chunks.length) {
      let currentDir = chunks.join(path.sep);
      if (currentDir === '') {
        currentDir = path.resolve(directory, '/');
      }

      const filePath = path.join(currentDir, name);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
      chunks.pop();
    }
    return null;
  }

  /**
   * attach dynamic options to file options
   * @param  {string} text content of editor
   * @return {object}      created options
   */
  loadDynamicOptions(text) {
    const dynamicOptions = {};
    this._addUnknownTagsToNewBlockLevel(text, dynamicOptions);
    this._addShowBodyOnly(text, dynamicOptions);
    this._addShowErrors(text, dynamicOptions);
    return dynamicOptions;
  }

  /**
   * add tags with - to tidy html 5 new block level tags
   *
   * @param {string} text current text
   * @param {object} options tidy html 5 options
   */
  _addUnknownTagsToNewBlockLevel(text, options) {
    if (this.settings.enableDynamicTags) {
      var elements = text.split('<');

      var blockLevelTags = lodash(elements)
        .map((obj) => obj.trim().split(' ')[0])
        .filter((obj) => !obj.startsWith('/') && !obj.startsWith('!'))
        .filter((obj) => obj.indexOf('-') > 0)
        .uniq()
        .join();
      var existingBlockLevelTags = options['new-blocklevel-tags'];
      if (existingBlockLevelTags) {
        blockLevelTags = existingBlockLevelTags + ' ' + blockLevelTags;
      }
      if(blockLevelTags.length > 0){
        options['new-blocklevel-tags'] = blockLevelTags;
      }
    }
  }

  /**
   * add show-body-only if <body> exists
   *
   * @param {string} text current text
   * @param {object} options tidy html 5 options
   */
  _addShowBodyOnly(text, options) {
    if (this.settings.enableDynamicBody) {
      options['show-body-only'] = text.indexOf('<body') < 0;
    }
  }

  /**
   * add show-errors setting
   *
   * @param {string} text current text
   * @param {object} options tidy html 5 options
   */
  _addShowErrors(text, options) {
    if (this.settings.showErrors && (!options['show-errors'] || options['show-errors'] === 0)) {
      options['show-errors'] = 6;
    }
  }
}
export default OptionsHandler;
