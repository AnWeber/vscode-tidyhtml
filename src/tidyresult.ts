'use strict';

//const EXIT_CODE_OK = 0;
const EXIT_CODE_WARNING = 1;
const EXIT_CODE_ERROR = 2;

/**
 * Result
 */
export class TidyResult {
    value: string;
    error: Error;
    isError: boolean;
    isWarning: boolean;

    constructor(value: string, error: string, exitCode: number) {
        this.value = value;
        if (error) {
            this.error = new Error(error);
        }
        this.isError = exitCode === EXIT_CODE_ERROR;
        this.isWarning = exitCode === EXIT_CODE_WARNING;
    }
}
export default TidyResult;
