'use strict';
import * as childprocess from 'child_process';
import * as lodash from 'lodash';
import { TidyResult } from './tidyresult';

/**
 * handle child_process to spawn tidy
 */
export class TidyWorker {
  tidyExec: string;
  options: any;

  constructor(tidyExec: string, options: any) {
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
  _parseOptions(options: any) {
    options = options || {};
    var args = [];

    const toHyphens = (str) => {
      return str.replace(/([A-Z])/g, function (m, w) {
        return '-' + w.toLowerCase();
      });
    };
    for (var opt in options) {
      if (opt) {
        args.push('--' + toHyphens(opt));
        switch (typeof options[opt]) {
          case 'string':
          case 'number':
            args.push(options[opt]);
            break;
          case 'boolean':
            args.push(options[opt] ? 'yes' : 'no');
            break;
          default:
            console.log('unknown option type: ' + typeof options[opt]);
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
  formatAsync(text): Promise<TidyResult> {
    let promise = new Promise((resolve, reject) => {

      try {
        const worker = childprocess.spawn(this.tidyExec, this._parseOptions(this.options));
        let formattedText: string = '';
        let error: string = '';
        worker.stdout.on('data', (data) => {
          formattedText += data;
        });
        worker.stderr.on('data', (data) => {
          error += data;
        });
        worker.on('exit', (code: number) => {
          resolve(new TidyResult(formattedText, error, code));
        });
        worker.stdin.end(text);
      } catch (err) {
        reject(new Error(err));
      }
    });
    return promise;
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
      worker.stderr.on('data', function (data) {
        error += data;
      });
      worker.on('exit', function (code) {
        resolve(error);
      });
      worker.stdin.end(text);
    });
  }
}
export default TidyWorker;
