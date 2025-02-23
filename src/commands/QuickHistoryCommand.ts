import {
    IHttp,
    IModify,
    IRead,
    IPersistence,
} from '@rocket.chat/apps-engine/definition/accessors';
import {
    ISlashCommand,
    SlashCommandContext,
} from '@rocket.chat/apps-engine/definition/slashcommands';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { notifyMessage } from '../helpers/notifier';
import { QuickHistoryApp, ModelType } from '../../QuickHistoryApp';

export class QuickHistoryCommand implements ISlashCommand {
    public command = 'quickhistory';
    public i18nDescription = 'Summarize recent messages in the current chat';
    public providesPreview = false;
    public i18nParamsExample = 'Usage: /quickhistory or /quickhistory config <model_type> <api_key>';

    constructor(private readonly app: QuickHistoryApp) {}

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
    ): Promise<void> {
        const [subCommand, ...params] = context.getArguments();
        const sender = context.getSender();
        const room = context.getRoom();

        if (subCommand === 'config') {
            const [modelType, apiKey] = params;
            await this.handleConfig(modelType as ModelType, apiKey, read, modify, sender, room);
            return;
        }

        await this.handleSummary(read, modify, http, sender, room);
    }

    private async handleConfig(
        modelType: ModelType,
        apiKey: string,
        read: IRead,
        modify: IModify,
        sender: IUser,
        room: IRoom
    ): Promise<void> {
        if (!modelType || !['groq', 'gpt'].includes(modelType)) {
            await notifyMessage(
                room,
                read,
                sender,
                'Please specify the model type (groq or gpt) followed by the API key.',
                'error'
            );
            return;
        }

        if (!apiKey) {
            await notifyMessage(
                room,
                read,
                sender,
                'Please provide an API key with the config command.',
                'error'
            );
            return;
        }

        try {
            this.app.setApiConfig(apiKey, modelType);

            await notifyMessage(
                room,
                read,
                sender,
                `${modelType.toUpperCase()} API key has been configured successfully!`,
                'success'
            );
        } catch (error) {
            await notifyMessage(
                room,
                read,
                sender,
                `Failed to save API key: ${error.message}`,
                'error'
            );
        }
    }

    private async handleSummary(
        read: IRead,
        modify: IModify,
        http: IHttp,
        sender: IUser,
        room: IRoom
    ): Promise<void> {
        try {
            const apiConfig = this.app.getApiConfig();

            if (!apiConfig) {
                await notifyMessage(
                    room,
                    read,
                    sender,
                    'API not configured. Please use `/quickhistory config <model_type> <api_key>` to set up the API.',
                    'error'
                );
                return;
            }

            await notifyMessage(
                room,
                read,
                sender,
                'Generating summary... Please wait.',
                'info'
            );

            const messageHistory = await this.getLastMessages(read, room, 50);
            if (!messageHistory.length) {
                await notifyMessage(
                    room,
                    read,
                    sender,
                    'No messages found to summarize.',
                    'info'
                );
                return;
            }

            const formattedMessages = messageHistory.map(msg => ({
                username: msg.username,
                text: msg.text
            }));

            let response;
            if (apiConfig.type === 'groq') {
                response = await http.post('https://api.groq.com/openai/v1/chat/completions', {
                    headers: {
                        'Authorization': `Bearer ${apiConfig.key}`,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        model: "mixtral-8x7b-32768", 
                        messages: [
                            {
                                role: "system",
                                content: "You are a helpful assistant that summarizes chat conversations. Provide a concise summary of the main points and key discussions."
                            },
                            {
                                role: "user",
                                content: JSON.stringify(formattedMessages)
                            }
                        ]
                    }
                });
            } else {
                response = await http.post('https://api.openai.com/v1/chat/completions', {
                    headers: {
                        'Authorization': `Bearer ${apiConfig.key}`,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        model: "gpt-3.5-turbo",
                        messages: [
                            {
                                role: "system",
                                content: "You are a helpful assistant that summarizes chat conversations. Provide a concise summary of the main points and key discussions."
                            },
                            {
                                role: "user",
                                content: JSON.stringify(formattedMessages)
                            }
                        ]
                    }
                });
            }

            if (response.statusCode !== 200) {
                throw new Error(`Failed to get summary from ${apiConfig.type.toUpperCase()}`);
            }

            const summary = response.data.choices[0].message.content;
            
            await notifyMessage(
                room,
                read,
                sender,
                `Summary of last ${messageHistory.length} messages:\n\n${summary}`,
                'info'
            );

            await notifyMessage(
                room,
                read,
                sender,
                'Summary has been generated successfully!',
                'success'
            );

        } catch (error) {
            await notifyMessage(
                room,
                read,
                sender,
                `Error generating summary: ${error.message}`,
                'error'
            );
        }
    }

    private async getLastMessages(read: IRead, room: IRoom, limit: number) {
        const roomId = room.id;
        const historicalMessages = await read.getRoomReader().getMessages(
            roomId,
            {
                skip: 0,
                limit,
                sort: { createdAt: 'desc' },
            }
        );

        return historicalMessages
            .reverse()
            .map(msg => ({
                text: msg.text || msg.attachments?.[0]?.description || '',
                username: msg.sender.username || 'unknown'
            }));
    }
}
