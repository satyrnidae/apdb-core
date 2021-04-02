import { Command, lazyInject, ServiceIdentifiers, ICommandService, IModuleService, Module, IClientService, IConfigurationService, IMessageService } from "@satyrnidae/apdb-api";
import { Options, Arguments } from 'yargs-parser';
import { Message, NewsChannel } from "discord.js";
import { CoreMessageService } from "../services/core-message-service";

/**
 * Command handler which provides information on plugins and usage information
 * for commands.
 */
export class HelpCommand extends Command {
  /**
   * The friendly name for the command.
   */
  public friendlyName: string = 'Help';
  /**
   * The command that will be executed via the bot.
   */
  public command: string = 'help';
  /**
   * Command syntax details
   */
  public syntax: string[] = [
    'help',
    'help {-a|--all} [[-p|--page] page]',
    'help {-l|--plugin} plugin [[-p|--page] page]',
    'help [-c|--command] command [{-l|--plugin} plugin] [[-p|--page] page]'
  ];

  public description: string = 'Provides a detailed overview of any command that the bot can perform.';

  public options: Options = {
    alias: {
      command: ['-c'],
      all: ['-a'],
      plugin: ['-l'],
      page: ['-p']
    },
    string: ['command', 'plugin'],
    boolean: ['all'],
    number: ['page'],
    configuration: {
      'duplicate-arguments-array': false
    }
  };

  /**
   * The core message service.
   */
  @lazyInject(CoreMessageService)
  private readonly coreMessageService!: CoreMessageService;

  /**
   * Checks if the command
   */
  public async checkPermissions(): Promise<boolean> {
    return true;
  }

  /**
   * Executes the help command.
   * @param message The command message.
   * @param args The arguments passed to the command.
   */
  public async run(message: Message, args: Arguments): Promise<void> {
    if (message.channel instanceof NewsChannel) {
      await this.coreMessageService.sendCommandCannotExecuteInNewsChannelMessage(message);
    }
    const page: number = args.page || args._.length ? +args._[args._.length - 1] || 1 : 1;
    let command: string = args.command || args._[0];
    let module: string = args.plugin;

    if (this.allParam(args)) {
      return this.coreMessageService.sendPaginatedHelpMessage(message, null, null, page);
    } else if (command || module) {
      if (!module && command.indexOf(':') >= 0) {
        const sections: string[] = command.split(':');
        if (sections.length >= 2) {
          module = sections[0];
          command = sections.slice(1).join(':');
        } else {
          command = sections[0];
        }
      }
      return this.coreMessageService.sendPaginatedHelpMessage(message, module, command, page);
    }

    return this.coreMessageService.sendHelpMessage(message);
  }

  private allParam(args: Arguments) {
    return args['all'] !== undefined && args['all'] || args._.length && args._[0] === 'all';
  }
}
