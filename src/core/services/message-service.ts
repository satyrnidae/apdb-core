import { IMessageService, ServiceIdentifiers, IClientService, ILoggingService, Logger, IConfigurationService, IDataService } from '@satyrnidae/apdb-api';
import { OneOrMany, toMany, forEachAsync, toOne, sleep } from '@satyrnidae/apdb-utils';
import { Message, Channel, DMChannel, TextChannel, PartialDMChannel, MessageEmbed, ChannelResolvable, NewsChannel, MessageActionRow, MessageButton, ThreadChannel, MessagePayload, ReplyMessageOptions, MessageOptions, PartialMessage } from 'discord.js';
import { inject, injectable } from 'inversify';
import { GuildConfiguration } from '../../db/entity/guild-configuration';
import { IAppConfiguration } from './configuration/app-configuration';

type MessageContent = string | MessagePayload | MessageOptions;
type ReplyMessageContent = string | MessagePayload | ReplyMessageOptions;
type TextChannelTypes = PartialDMChannel | DMChannel | TextChannel | NewsChannel | ThreadChannel;

@injectable()
export class MessageService implements IMessageService {

  private readonly log: Logger;

  constructor(@inject(ServiceIdentifiers.Client) private readonly clientService: IClientService,
              @inject(ServiceIdentifiers.Logging) private readonly loggingService: ILoggingService,
              @inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService<IAppConfiguration>,
              @inject(ServiceIdentifiers.Data) private readonly dataService: IDataService) {
    this.log = this.loggingService.getLogger('core');
  }

  public async send(channel: ChannelResolvable, content: MessageContent): Promise<OneOrMany<Message>> {
    const resolvedChannel: Channel = await this.resolveChannel(channel);

    if (!(resolvedChannel && (resolvedChannel instanceof TextChannel || resolvedChannel instanceof DMChannel || resolvedChannel instanceof NewsChannel))) {
      this.log.error('Failed to send message: Could not resolve text channel!');
      this.log.trace('Trace information:');
      return [];
    }
    const messages: Message[] = toMany(await this.sendWithTyping(resolvedChannel, content));
    const deletionNotice: Message[] = toMany(await this.sendDeletionExplainer(resolvedChannel));

    if (deletionNotice && deletionNotice.length) {
      messages.push(...deletionNotice);
    }

    return messages;
  }

  private async sendWithTyping(channel: TextChannelTypes, content: MessageContent): Promise<OneOrMany<Message>> {
    await this.pauseForTyping(channel, content);

    const messageContent = this.setDeletionHandlers(content);

    return channel.send(messageContent);
  }

  private async replyWithTyping(message: Message, content: ReplyMessageContent): Promise<OneOrMany<Message>> {
    await this.pauseForTyping(message.channel, content);

    const replyMessageContent = this.setDeletionHandlers(content);

    return message.reply(replyMessageContent);
  }

  private async pauseForTyping(channel: TextChannelTypes, content: MessageContent): Promise<void> {
    if (!content) {
      return;
    }

    let toType: string;

    if (typeof content === 'string') {
      toType = content;
    } else if (content instanceof MessagePayload) {
      toType = content.options.content;
    } else {
      toType = content.content;
    }

    if (!toType || !toType.length) return;

    if ((await this.configurationService.get('typingEmulation'))) {;
      channel.sendTyping();

      this.log.debug(`Typing a message for 250 milliseconds.`);

      await sleep(250)
    }
  }

  private setDeletionHandlers(content: MessageContent) : MessagePayload | MessageOptions {
    const deleteAction: MessageActionRow = new MessageActionRow()
    .addComponents([
      new MessageButton()
        .setCustomId('deleteMessage')
        .setLabel('Delete')
        .setStyle('DANGER')
    ]);

    if (typeof content === 'string') {
      return {content: content, components: [deleteAction]}
    } else if (content instanceof MessagePayload) {
      content.options.components.push(deleteAction);
    } else {
      if (!content.components) {
        content.components = [];
      }
      content.components.push(deleteAction);
    }

    return content;
  }

  public async reply(message: Message, content: ReplyMessageContent): Promise<OneOrMany<Message>> {
    if (!message) {
      this.log.error('Failed to delete message: Could not resolve the message object!');
      return [];
    }

    const messages: Message[] = [];

    messages.push(...toMany(await this.replyWithTyping(message, content)));
    const deletionNotice: Message[] = toMany(await this.sendDeletionExplainer(message.channel));

    if (deletionNotice && deletionNotice.length) {
      messages.push(...deletionNotice);
    }

    return messages;
  }

  public async delete(message: Message<boolean> | PartialMessage): Promise<Message> {
    if (!message) {
      this.log.error('Failed to delete message: Could not resolve the message object!');
      return null;
    }
    if (!message.deletable) {
      this.log.error('Failed to delete message: Message was not deletable.');
      return null;
    }

    return message.delete();
  }

  public async replyWithPaginatedEmbed(embeds: MessageEmbed[], replyTo: Message, content?: ReplyMessageContent, page: number = 0): Promise<void> {
    if (!replyTo) {
      this.log.error('Failed to delete message: Could not resolve the message object!');
      return;
    }

    return;
  }

  private async sendDeletionExplainer(channel: TextChannelTypes): Promise<OneOrMany<Message>> {
    if ("guild" in channel) {
      const guildConfiguration: GuildConfiguration = toOne(await this.dataService.find(GuildConfiguration, {id: channel.guild.id}));
      if (!guildConfiguration.hasDeletedMessage) {
        guildConfiguration.hasDeletedMessage = true;
        await guildConfiguration.save();

        const content: string = 'This is the first message I\'ve sent in this guild, so you should know that if you\'d like to delete any messages I send in the future, just react with the "🗑️" emote!';

        return this.sendWithTyping(channel, content);
      }
    }

    return [];
  }

  private async resolveChannel(channel: ChannelResolvable): Promise<Channel> {
    let resolvedChannel: Channel;
    if (channel instanceof Channel) {
      resolvedChannel = await channel.fetch();
    } else {
      this.clientService.getClient().channels.fetch(channel, {force: true, cache: true});
    }

    return resolvedChannel;
  }
}
