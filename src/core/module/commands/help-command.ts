import { Command, ICommandService, IModuleService, Module, ServiceIdentifiers, SlashCommand, SlashOrMessageCommand } from "@satyrnidae/apdb-api";
import { Options, Arguments } from 'yargs-parser';
import { CommandInteraction, Guild, Interaction, Message, NewsChannel } from "discord.js";
import { CoreMessageService } from "../services/core-message-service";
import { OneOrMany, toMany } from "@satyrnidae/apdb-utils";
import { injectable } from "inversify";
import { inject } from "inversify";
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from '@discordjs/builders';
import { allowedNodeEnvironmentFlags } from "process";
/**
 * Command handler which provides information on plugins and usage information
 * for commands.
 */
@injectable()
export class HelpCommand extends SlashOrMessageCommand {
  /**
   * The friendly name for the command.
   */
  public readonly friendlyName: string = 'Help';
  /**
   * The command that will be executed via the bot.
   */
  public name: string = 'help';
  /**
   * Command syntax details
   */
  public syntax: OneOrMany<string> = [
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

  constructor(@inject(CoreMessageService) private readonly coreMessageService: CoreMessageService,
              @inject(ServiceIdentifiers.Command) private readonly commandService: ICommandService,
              @inject(ServiceIdentifiers.Module) private readonly moduleService: IModuleService) {
    super('core');
  }

  public async execute(target: CommandInteraction | Message, args?: Arguments): Promise<any> {
    let showAllCommands: boolean;
    let commandName: string;
    let pluginId: string;
    let page: number;
    if (target instanceof Interaction) {
      showAllCommands = target.options.getBoolean('all', false) ?? false;
      commandName = target.options.getString('command', false);
      pluginId = target.options.getString('plugin', false);
      page = target.options.getInteger('page', false);
    } else {
      showAllCommands = this.allParam(args);
      commandName = args.command || args._[0];
      pluginId = args.plugin;
      page = args.page || args._.length ? +args._[args._.length-1] || 1 : 1;
    }

    if (showAllCommands) {
      return this.coreMessageService.sendPaginatedHelpMessage(target, null, null, page);
    } else if (commandName || pluginId) {
      if (!pluginId && commandName.indexOf(':') >= 0) {
        const sections: string[] = commandName.split(':');
        if (sections.length >= 2) {
          pluginId = sections[0];
          commandName = sections[1];
        } else {
          commandName = sections[0];
        }
      }
      return this.coreMessageService.sendPaginatedHelpMessage(target, pluginId, commandName, page);
    }

    return this.coreMessageService.sendHelpMessage(target);
  }

  /**
   * Makes sure the command can be executed by the message sender.
   * @param message The message containing the command.
   * @returns A boolean flag determining whether the command is or is not allowed to execute.
   */
  public checkPermissions(message: Message): boolean {
    return !(message.channel instanceof NewsChannel) && super.checkPermissions(message);
  }

  private allParam(args: Arguments) {
    return args['all'] !== undefined && args['all'] || args._.length && args._[0] === 'all';
  }

  public async asSlashCommand(guild?: Guild): Promise<SlashCommandBuilder | SlashCommandSubcommandBuilder> {
      const slashCommand = this.slashCommandBuilder;

      slashCommand.addBooleanOption(option => option
          .setName('all')
          .setDescription('Whether or not help detailing all plugins should be shown.'))
        .addIntegerOption(option => option
          .setName('page')
          .setDescription('Show help from a specific page.'));

      const commands: Command[] = toMany(await this.commandService.getAll({guild: guild}));

      slashCommand.addStringOption(option => option
        .setName('command')
        .setDescription('The name of the command you need help with.')
        .addChoices(commands.map(command => [command.name, command.name])));

      const modules: Module[] = toMany(await this.moduleService.getAllModules(guild));

      slashCommand.addStringOption(option => option
        .setName('plugin')
        .setDescription('The name of the plugin that you need help with.')
        .addChoices(modules.map(module => [module.moduleInfo.name, module.moduleInfo.id])));

      return slashCommand;
  }
}
