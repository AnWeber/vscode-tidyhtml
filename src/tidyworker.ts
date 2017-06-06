'use strict';
import * as childprocess from 'child_process';
import { TidyResult } from './tidyresult';

/**
 * handle child_process to spawn tidy
 */
export class TidyWorker {
  tidyExec: string;
  traceLogging: boolean;
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
  private parseOptions(options: any) {
    options = options || {};
    let args = [];

    const toHyphens = (str: string) => {
      return str.replace(/([A-Z])/g, function (_m: string, w: string) {
        return '-' + w.toLowerCase();
      });
    };
    for (let opt in options) {
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
  formatAsync(text: string): Promise<TidyResult> {
    return new Promise((resolve, reject) => {
      try {
        const args = this.parseOptions(this.options);
        if (this.traceLogging) {
          console.info(`spawn: ${this.tidyExec} ${args}`);
        }
        const worker = childprocess.spawn(this.tidyExec, args);
        let formattedText: string = '';
        let error: string = '';
        worker.stdout.on('data', (data) => {
          formattedText += data;
        });
        worker.stderr.on('data', (data) => {
          if (this.traceLogging) {
            console.info(`spawn error: ${JSON.stringify(data)}`);
          }
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
  }
}
export default TidyWorker;
