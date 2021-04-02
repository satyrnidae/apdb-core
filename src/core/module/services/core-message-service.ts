import { injectable, inject } from "inversify";
import { ServiceIdentifiers, IConfigurationService, IClientService, IDataService, IMessageService, ICommandService, Module, IModuleService, Command } from "@satyrnidae/apdb-api";
import { Guild, Client, GuildMember, TextChannel, Message, EmojiResolvable, MessageEmbed, DMChannel } from "discord.js";
import { GuildConfiguration } from "../../../db/entity/guild-configuration";
import { toOne, OneOrMany, pickRandom, toMany, forEachAsync } from "@satyrnidae/apdb-utils";
import { IAppConfiguration } from "../../services/configuration/app-configuration";

const MAX_FIELD_CHARS = 1024;

/**
 * Handles sending / translating all canned messages for the core components of the bot.
 */
@injectable()
export class CoreMessageService {
  /**
   * The discord.js client instance.
   */
  private readonly client: Client;

  constructor(@inject(ServiceIdentifiers.Data) private readonly dataService: IDataService,
    @inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService<IAppConfiguration>,
    @inject(ServiceIdentifiers.Command) private readonly commandService: ICommandService,
    @inject(ServiceIdentifiers.Message) private readonly messageService: IMessageService,
    @inject(ServiceIdentifiers.Module) private readonly moduleService: IModuleService,
    @inject(ServiceIdentifiers.Client) clientService: IClientService) {
    this.client = clientService.getClient();
  }

  /**
   * Sends a welcome message to a guild.
   * @param guild The guild which the message will be sent to
   */
  public async sendGuildWelcomeMessage(guild: Guild): Promise<void> {
    if (!(await this.configurationService.get('showWelcomeMessage'))) {
      return;
    }
    const guildConfiguration: GuildConfiguration = toOne(await this.dataService.load(GuildConfiguration, {id: guild.id}));
    if (guildConfiguration.welcomeMessageSent) {
      return;
    }
    const me: GuildMember = guild.members.cache.get(this.client.user.id);
    const announceChannel: TextChannel = guild.channels.cache
      .filter(channel => channel instanceof TextChannel && channel.permissionsFor(me).has('SEND_MESSAGES')).first() as TextChannel;
    if (announceChannel && (await this.sendWelcomeMessage(me, announceChannel, guildConfiguration.commandPrefix))) {
      guildConfiguration.welcomeMessageSent = true;
      await guildConfiguration.save();
    }
  }

  /**
   * Replies to a message with a canned message indicating that the command could not be sent in the channel.
   * @param replyTo The message to reply to.
   * @returns One or many messages which were sent by the bot.
   */
  public async sendCommandCannotExecuteInNewsChannelMessage(replyTo: Message): Promise<void> {
    // TODO: Translate messages
    await this.messageService.reply(replyTo, 'I can\'t run that command in a news channel!');
  }

  /**
   * Replies to a message with the canned help message.
   * @param replyTo The message to reply to.
   * @returns One or many messages that were sent by the bot.
   */
  public async sendHelpMessage(replyTo: Message): Promise<void> {
    // TODO: Translate messages
    const name: string = replyTo.guild ? replyTo.guild.me.displayName : this.client.user.username;
    const prefix: string = await this.commandService.getCommandPrefix(replyTo.guild);
    const randomHeart: EmojiResolvable = pickRandom(await this.configurationService.get('hearts'));
    const helpMessage: string = `Hi! I'm ${name}, your modular robot friend!\n`
      .concat(`To list all the commands that I can understand, just send the command \`${prefix}help --all\` somewhere i can see it!\n`)
      .concat(`You can also check out my core documentation on <https://www.github.com/satyrnidae/apdb-core>.\n`)
      .concat(`Thanks! ${randomHeart}`);

    await this.messageService.reply(replyTo, helpMessage);
  }

  /**
   * Returns a paginated embed containing all of the available commands filtered by module.
   * @param replyTo The message to reply to.
   * @param page The initial page to start on.
   * @returns
   */
  public async sendPaginatedHelpMessage(replyTo: Message, moduleId: string, commandId: string, page: number): Promise<void> {
    let modules: Module[] = toMany(await this.moduleService.getAllModules(replyTo.guild));

    if (moduleId) {
      modules = modules.filter(module => module.moduleInfo.id.toLowerCase() === moduleId.toLowerCase());
    }

    if (!modules.length) {
      let prefix: string = await this.commandService.getCommandPrefix(replyTo.guild);
      await this.messageService.reply(replyTo, 'I apologize, but I couldn\'t find anything that matched those options!\n'
        .concat(`You can use the command \`${prefix}help all\` to list everything I know about!`));
      return;
    }

    const embeds: MessageEmbed[] = [];
    const prefix: string = await this.commandService.getCommandPrefix(replyTo.guild);

    await forEachAsync(modules, async (module: Module) => {
      const commands: Command[] = toMany(await this.commandService.getAll(module.moduleInfo.id, replyTo.guild));
      if (commandId) {
        embeds.push(...this.createCommandInfoEmbeds(module, commandId, commands, prefix));
      } else {
        embeds.push(...this.createModuleInfoEmbeds(module, commands, prefix));
      }
    });

    await this.messageService.replyWithPaginatedEmbed(embeds, replyTo, 'Here\'s what I found:', page);
  }

  /**
   * Sends a message to a user letting them know that the command prefix can't be changed in a direct message.
   * @param channel The DMChannel that the user executed the command in.
   * @returns One or many messages.
   */
  public async sendCannotChangePrefixInDmMessage(channel: DMChannel): Promise<OneOrMany<Message>> {
    const prefix: string = await this.commandService.getCommandPrefix(null);
    return this.messageService.send(channel, 'Hey there! I\'m sorry, but you can\'t change the command prefix within a direct message.\n'
      .concat('You can set the command prefix for a specific guild if you\'re an admin, owner, or have the "Manage Server" permission.\n')
      .concat(`As always, feel free to ask for help with the command \`${prefix}help\`!`));
  }

  /**
   * Sends a message to the specified channel letting a user know
   * @param channel
   * @returns
   */
  public async sendInvalidPrefixMessage(message: Message): Promise<OneOrMany<Message>> {
    return this.messageService.reply(message, 'Unfortunately, I can\'t set the prefix to that! Please choose a different prefix.\n'
      .concat('Valid prefixes are fifteen characters or less in length, and must not be empty.'));
  }

  /**
   * Sends a message showing that the prefix was updated.
   * @param message
   * @param prefix
   * @returns
   */
  public async sendPrefixChangedSuccessfullyMessage(message: Message, prefix: string): Promise<OneOrMany<Message>> {
    const defaultPrefix: string = await this.configurationService.get('defaultPrefix');
    return this.messageService.reply(message, `The server's custom prefix has been updated to \`${prefix}\`!\n`
      .concat('From now on, I\'ll respond to commands which start with that.\n')
      .concat(`I'll still keep listening to \`${defaultPrefix}help\`, so feel free to use that if you forget!`));
  }

  private createCommandInfoEmbeds(module: Module, commandId: string, commands: Command[], prefix: string): MessageEmbed[] {
    const embeds: MessageEmbed[] = [];
    commands.filter(command => command.command.toLowerCase() === commandId.toLowerCase()).forEach(command => {
      const embed: MessageEmbed = new MessageEmbed()
        .setAuthor(module.moduleInfo.name, module.moduleInfo.details.thumbnail,module.moduleInfo.details.website)
        .setTitle(`${command.friendlyName} Command`)
        .setDescription(command.description)
        .setFooter('')
        .addField('Module', module.moduleInfo.name, true)
        .addField('Version', module.moduleInfo.version, true)
        .addField('API', module.moduleInfo.details.apiVersion, true)
        .addField('Syntax', `\`\`\`${toMany(command.syntax).map(syntax => `${prefix}${syntax}`).join('\n')}\`\`\``, false);
      this.addAuthorField(embed, module);
      this.addFundingField(embed, module);
      embeds.push(embed);
    });
    return embeds;
  }

  private addMultilineField(embed: MessageEmbed, fieldName: string, startingString: string, noValuesString: string, items: string[]): void {
    if (items.length) {
      let fieldValue: string = startingString;
      for (const item of items) {
        if (fieldValue.length + item.length > MAX_FIELD_CHARS) {
          continue;
        }
        fieldValue = fieldValue.concat('\n',item);
      }
      if (fieldValue === startingString) {
        fieldValue = noValuesString;
      }

      embed.addField(fieldName, fieldValue, false);
    }
  }

  private addFundingField(embed: MessageEmbed, module: Module): void {
    return this.addMultilineField(
      embed,
      'Donate',
      '',
      '*Check this module\'s package.json file for the donation link.*',
      toMany(module.moduleInfo.details.donate)
    )
  }

  private addAuthorField(embed: MessageEmbed, module: Module): void {
    return this.addMultilineField(
      embed,
      'Author',
      '',
      'Check this module\'s package.json file for the contributor names.',
      toMany(module.moduleInfo.details.authors)
    )
  }

  private createModuleInfoEmbed(module: Module, commands: string): MessageEmbed {
    const embed: MessageEmbed = new MessageEmbed()
      .setAuthor(module.moduleInfo.name, module.moduleInfo.details.thumbnail,module.moduleInfo.details.website)
      .setDescription(module.moduleInfo.details.description)
      .setFooter('')
      .addField('Version', module.moduleInfo.version, true)
      .addField('API', module.moduleInfo.details.apiVersion, true)
      .addField('Commands', commands, false);
    this.addAuthorField(embed, module);
    this.addFundingField(embed, module);
    embed

    return embed;
  }

  private createModuleInfoEmbeds(module: Module, commands: Command[], prefix: string): MessageEmbed[] {
    const embeds: MessageEmbed[] = [];
    let commandList: string = '';

    if (commands.length) {
      commands.forEach(command => {
        const description: string = `\`${prefix}${command.command}\`: ${command.description}`;
        if (commandList.length + description.length + 1 <= MAX_FIELD_CHARS) {
          commandList = commandList.concat('\n',description);
        } else {
          embeds.push(this.createModuleInfoEmbed(module, commandList));
          commandList = description;
        }
      });
    } else {
      commandList = '*This module does not provide any commands.*'
    }

    if (commandList) {
      embeds.push(this.createModuleInfoEmbed(module, commandList));
    }

    return embeds;
  }

  private async sendWelcomeMessage(me: GuildMember, channel: TextChannel, commandPrefix: string): Promise<OneOrMany<Message>> {
    // TODO: Translate messages
    const text: string = `Hello everyone! ${me.displayName} here.\r\n` +
      `I'm a modular bot framework, with a potential variety of functions!\r\n` +
      `Feel free to ask for \`${commandPrefix}help\` if you're interested in learning more!`;
    return this.messageService.send(channel, text);
  }
}
