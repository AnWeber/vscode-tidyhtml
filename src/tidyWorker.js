'use babel';

import childprocess from 'child_process';
import lodash from 'lodash';

//const EXIT_CODE_OK = 0;
const EXIT_CODE_WARNING = 1;
const EXIT_CODE_ERROR = 2;

/**
 * handle child_process to spawn tidy
 */
class TidyWorker {
  constructor(tidyExec, options) {
    this.tidyExec = tidyExec;

    this.options = options;
    this.options.tidyMark = false;
    this.options.forceOutput = true;
    this.options.quiet = false;
  }
  /**
   * convert json to command line arguments
   * @param  {object} options json object to convert
   * @return {array} command line arguments
   */
  _parseOptions(options) {
    options = options || {};
    var args = [];

    const toHyphens = (str) => {
      return str.replace(/([A-Z])/g, function(m, w) {
        return '-' + w.toLowerCase();
      });
    };
    for (var n in options) {
      if (n) {
        args.push('--' + toHyphens(n));
        switch (typeof options[n]) {
          case 'string':
          case 'number':
            args.push(options[n]);
            break;
          case 'boolean':
            args.push(options[n] ? 'yes' : 'no');
            break;
          default:
            throw new Error('unknown option type: ' + typeof options[n]);
        }
      }
    }
    return args;
  }
  /**
   * format text with tidy
   * @param  {string} text content for formatting
   * @return {Promise} promise
   */
  formatAsync(text) {
    return new Promise((resolve, reject) => {
      const worker = childprocess.spawn(this.tidyExec, this._parseOptions(this.options));
      let formattedText = '';
      let error = '';
      worker.stdout.on('data', (data) => {
        formattedText += data;
      });
      worker.stderr.on('data', (data) => {
        error += data;
      });
      worker.on('exit', (code) => {
        if (code === EXIT_CODE_ERROR && this.options['show-errors']) {
          reject(error);
        } else if (code === EXIT_CODE_WARNING && this.options['show-warnings']) {
          reject(error);
        } else {
          if (error && error.indexOf('No warnings or errors were found.') < 0) {
            console.log(error);
          }
          resolve(formattedText);
        }
      });
      worker.stdin.end(text);
    });
  }

  /**
   * resolve errors of text
   * @param  {string} text text of errors
   * @return {Promise} promise
   */
  errors(text) {

    return new Promise((resolve, reject) => {
      const options = lodash.merge({}, this.options, {
        "show-errors": 10,
      });
      const worker = childprocess.spawn(this.tidyExec, this._parseOptions(options));
      let error = '';
      worker.stderr.on('data', function(data) {
        error += data;
      });
      worker.on('exit', function(code) {
        resolve(error);
      });
      worker.stdin.end(text);
    });
  }
}
export default TidyWorker;
