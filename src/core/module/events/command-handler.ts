import { ServiceIdentifiers, IConfigurationService, ICommandService, Command, Logger, ILoggingService, MessageEventHandler, IMessageService, MessageCommand, SlashOrMessageCommand } from "@satyrnidae/apdb-api";
import { CoreMessageService } from "../services/core-message-service";
import { parse } from 'discord-command-parser';
import { Message } from "discord.js";
import { toMany, toOne } from "@satyrnidae/apdb-utils";
import yparser, { Arguments } from 'yargs-parser';
import { IAppConfiguration } from "../../services/configuration/app-configuration";
import { inject } from "inversify";
import { injectable } from "inversify";

@injectable()
export class CommandHandler extends MessageEventHandler {
  constructor(@inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService<IAppConfiguration>,
              @inject(ServiceIdentifiers.Command) private readonly commandService: ICommandService,
              @inject(CoreMessageService) private readonly coreMessageService: CoreMessageService,
              @inject(ServiceIdentifiers.Message) private readonly messageService: IMessageService,
              @inject(ServiceIdentifiers.Logging) private readonly loggingService: ILoggingService) {
    super('core');
  }

  /**
   * Checks the inbound message for a command and delegates accordingly
   * @param message The message to check
   */
  public async handler(message: Message): Promise<void> {
    const log: Logger = this.loggingService.getLogger('core');

    const senderId: string = message.author.tag;

    let prefix: string = await this.commandService.getCommandPrefix(message.guild);
    let parsedMessage = parse(message, prefix);

    if (!parsedMessage.success) {
      prefix = await this.configurationService.get('defaultPrefix');
      parsedMessage = parse(message, prefix);
      if (!parsedMessage.success || parsedMessage.command !== 'help') {
        return;
      }
    }

    let moduleId: string;
    let commandText: string = parsedMessage.command;
    if (commandText.indexOf(':') >= 0) {
      const sections: string[] = commandText.split(':');
      if (sections.length >= 2) {
        moduleId = sections[0];
        commandText = sections.slice(1).join(':');
      } else {
        commandText = sections[0];
      }
    }

    let command: Command;
    if (!moduleId) {
      // check core modules first
      moduleId = 'core';
      command = toOne(toMany(await this.commandService.get(commandText, { moduleId, guild: message.guild })).filter(command => command instanceof MessageCommand || command instanceof SlashOrMessageCommand));
      if (!command) {
        // not a core command, check all modules
        moduleId = undefined;
        command = toOne(toMany(await this.commandService.get(commandText, { moduleId, guild: message.guild })).filter(command => command instanceof MessageCommand || command instanceof SlashOrMessageCommand));
      }
    } else {
      // check specified module
      command = toOne(toMany(await this.commandService.get(commandText, { moduleId, guild: message.guild })).filter(command => command instanceof MessageCommand || command instanceof SlashOrMessageCommand));
    }

    if (!command || !(command instanceof MessageCommand || command instanceof SlashOrMessageCommand)) {
      log.debug(`${senderId} could not execute command ${moduleId}:${commandText} ${parsedMessage.arguments.join(' ')}: invalid command`);
      return;
    }

    moduleId = command.moduleId;

    if(!await command.checkPermissions(message)) {
      //TODO: Permission denied message
      log.debug(`${senderId} could not execute command ${moduleId}:${commandText} ${parsedMessage.arguments.join(' ')}: not permitted`);
      return;
    }

    const args: Arguments = yparser(parsedMessage.arguments, command.options);
    log.debug(`${senderId} executed command ${moduleId}:${commandText} ${parsedMessage.arguments.join(' ')}`);

    try {
      await command.execute(message, args);
    } catch (err) {
      log.error(err);
      this.messageService.reply(message, 'My apologies, I couldn\'t execute that command for some reason!');
    }
  }
}
