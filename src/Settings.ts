


export interface ISettings {
     optionsTidy: any;
    enableDynamicTags: boolean;
    tidyExecPath: string;
}

export class Settings implements ISettings{
    public optionsTidy: any;
    public enableDynamicTags: boolean;
    public tidyExecPath: string;
    constructor() {

    }
}