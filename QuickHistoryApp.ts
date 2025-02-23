import {
    IAppAccessors,
    ILogger,
    IConfigurationExtend,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { QuickHistoryCommand } from './src/commands/QuickHistoryCommand';

export type ModelType = 'groq' | 'gpt';

interface ApiConfig {
    key: string;
    type: ModelType;
}

export class QuickHistoryApp extends App {
    private apiConfig: ApiConfig | undefined;

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        await configuration.slashCommands.provideSlashCommand(new QuickHistoryCommand(this));
    }

    public setApiConfig(key: string, type: ModelType): void {
        this.apiConfig = { key, type };
    }

    public getApiConfig(): ApiConfig | undefined {
        return this.apiConfig;
    }
}
