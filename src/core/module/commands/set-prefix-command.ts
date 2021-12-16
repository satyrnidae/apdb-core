import { IConfigurationService, IDataService, MessageCommand, ServiceIdentifiers } from "@satyrnidae/apdb-api";
import { OneOrMany, toOne } from "@satyrnidae/apdb-utils";
import { DMChannel, Message, NewsChannel, PermissionResolvable } from "discord.js";
import { injectable } from "inversify";
import { inject } from "inversify";
import { Options, Arguments } from 'yargs-parser';
import { GuildConfiguration } from "../../../db/entity/guild-configuration";
import { IAppConfiguration } from "../../services/configuration/app-configuration";
import { CoreMessageService } from "../services/core-message-service";

/**
 * A command which sets the command prefix for the current guild.
 */
@injectable()
export class SetPrefixCommand extends MessageCommand {
  /**
   * The friendly name of the command
   */
  public friendlyName: string = 'Set Prefix';

  /**
   * The command that will be executed by the bot.
   */
  public name: string = 'setprefix';

  /**
   * Command syntax details
   */
  public syntax: OneOrMany<string> = 'setprefix [-p|--prefix] {prefix|\'default\'}';

  /**
   * Help text for the command
   */
  public description: string = 'Allows an administrator to set the command prefix for the guild.';

  public longDescription: string = 'Valid prefixes are fifteen characters or less, and should be easy to type.\n'
    .concat('Due to peculiarities related to parsing the command arguments, prefixes ending in a space should be enclosed in both single- and double-quotes. ')
    .concat('For example, a prefix:')
    .concat('```hey bot, ```')
    .concat('would have to be specified with the parameter:')
    .concat('```"\'hey bot, \'"```')
    .concat('The prefix may be set back to the default by passing the case-insensitive term "default" as the prefix parameter.');

  /**
   * Permissions required ot execute the command.
   */
  public permissions: PermissionResolvable = 'MANAGE_GUILD';

  /**
   * Command parser options
   */
  public options: Options = {
    alias: {
      prefix: ['-p']
    },
    string: ['prefix'],
    configuration: {
      'duplicate-arguments-array': false,
      'greedy-arrays': true
    }
  };

  constructor(@inject(CoreMessageService) private readonly coreMessageService: CoreMessageService,
              @inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService<IAppConfiguration>,
              @inject(ServiceIdentifiers.Data) private readonly dataService: IDataService) {
    super('core');
  }

  /**
   * Executes the set prefix command
   * @param message
   * @param args
   */
  public async execute(message: Message, args: Arguments): Promise<void> {
    if (!message.guild) {
      await this.coreMessageService.sendCannotChangePrefixInDmMessage(message.channel as DMChannel);
      return;
    }

    let prefix: string = (args['prefix'] || args._[0] || '') as string;
    prefix = prefix.trimStart().replace(/^["']/, '').trimEnd().replace(/["']$/, '');
    if (!prefix || !prefix.match(/^[a-zA-Z0-9 !@#$%^&*-=,./\\?`~]{1,15}$/)) {
      await this.coreMessageService.sendInvalidPrefixMessage(message);
      return;
    }

    if (prefix.toLowerCase() === 'default') {
      prefix = await this.configurationService.get('defaultPrefix');
    }

    const guildConfiguration: GuildConfiguration = toOne(await this.dataService.load(GuildConfiguration, {id: message.guild.id}));
    guildConfiguration.commandPrefix = prefix;
    await guildConfiguration.save();
    await this.coreMessageService.sendPrefixChangedSuccessfullyMessage(message, prefix);
  }

  /**
   * Makes sure the command can be executed by the message sender.
   * @param message The message containing the command.
   * @returns A boolean flag determining whether the command is or is not allowed to execute.
   */
  public checkPermissions(message: Message): boolean {
    return !(message.channel instanceof NewsChannel) && super.checkPermissions(message);
  }
}
