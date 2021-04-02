import { Command, IConfigurationService, lazyInject, ServiceIdentifiers } from "@satyrnidae/apdb-api";
import { toOne } from "@satyrnidae/apdb-utils";
import { DMChannel, Message, NewsChannel } from "discord.js";
import { Options, Arguments } from 'yargs-parser';
import { GuildConfiguration } from "../../../db/entity/guild-configuration";
import { GuildConfigurationFactory } from "../../../db/factory/guild-configuration-factory";
import { IAppConfiguration } from "../../services/configuration/app-configuration";
import { CoreMessageService } from "../services/core-message-service";

export class SetPrefixCommand extends Command {
  /**
   * The friendly name of the command
   */
  public friendlyName: string = 'Set Prefix';

  /**
   * The command that will be executed by the bot.
   */
  public command: string = 'setPrefix';

  /**
   * Command syntax details
   */
  public syntax: string[] = ['setPrefix [-p|--prefix] {prefix|\'default\'}'];

  /**
   * Help text for the command
   */
  public description: string = 'Allows an administrator to set the command prefix for the guild. Valid prefixes are fifteen characters or less, and should be easy to type.';

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

  @lazyInject(CoreMessageService)
  private readonly coreMessageService!: CoreMessageService;

  @lazyInject(ServiceIdentifiers.Configuration)
  private readonly configurationService!: IConfigurationService<IAppConfiguration>;

  /**
   * Executes the set prefix command
   * @param message
   * @param args
   */
  public async run(message: Message, args: Arguments): Promise<void> {
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

    const guildConfiguration: GuildConfiguration = toOne(await new GuildConfigurationFactory().load({id: message.guild.id}));
    guildConfiguration.commandPrefix = prefix;
    await guildConfiguration.save();
    await this.coreMessageService.sendPrefixChangedSuccessfullyMessage(message, prefix);
  }

  /**
   * Makes sure the command can be executed by the message sender.
   * @param message The message containing the command.
   * @returns A boolean flag determining whether the command is or is not allowed to execute.
   */
  public async checkPermissions(message: Message): Promise<boolean> {
    return !(message.channel instanceof NewsChannel) &&
      (!message.member || message.member.hasPermission('MANAGE_GUILD', { checkAdmin: true, checkOwner: true }));
  }
}
