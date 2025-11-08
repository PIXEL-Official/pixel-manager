import { REST, Routes } from 'discord.js';
import { commands } from '../commands';
import { logger } from './logger';

export async function deployCommands(clientId: string, guildId: string, token: string) {
  const commandsData = Object.values(commands).map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    logger.info(`Started refreshing ${commandsData.length} application (/) commands.`);

    // 길드 전용 명령어 등록 (빠른 업데이트)
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commandsData }
    ) as any[];

    logger.success(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error('Error deploying commands', error);
  }
}

