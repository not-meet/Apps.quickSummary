import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export async function notifyMessage(
    room: IRoom,
    read: IRead,
    user: IUser,
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
): Promise<void> {
    const notifier = read.getNotifier();
    const messageBuilder = notifier.getMessageBuilder();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

    messageBuilder.setText(`${icon} ${message}`);
    messageBuilder.setRoom(room);

    await notifier.notifyUser(user, messageBuilder.getMessage());
}
