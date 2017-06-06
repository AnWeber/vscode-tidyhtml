export interface Configuration {
    formatOnSave?: boolean | string[];
    optionsTidy?: any;
    enableDynamicTags?: boolean;
    tidyExecPath?: string;
    errorNotification?: string;
    warningNotification?: string;
    stopOnWarning?: boolean;
    traceLogging?: boolean;
}