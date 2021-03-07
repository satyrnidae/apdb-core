import { IMessageService, MessageContentResolvable, ServiceIdentifiers, IClientService, ILoggingService, Logger, IConfigurationService, IDataService } from '@satyrnidae/apdb-api';
import { OneOrMany, toMany, forEachAsync, toOne } from '@satyrnidae/apdb-utils';
import { Message, Channel, DMChannel, TextChannel, MessageEmbed, User, ChannelResolvable, NewsChannel } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Embeds } from 'discord-paginationembed';
import { GuildConfiguration } from '../../db/entity/guild-configuration';
import { IAppConfiguration } from './configuration/app-configuration';

@injectable()
export class MessageService implements IMessageService {

  private readonly log: Logger;

  constructor(@inject(ServiceIdentifiers.Client) private readonly clientService: IClientService,
              @inject(ServiceIdentifiers.Logging) private readonly loggingService: ILoggingService,
              @inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService<IAppConfiguration>,
              @inject(ServiceIdentifiers.Data) private readonly dataService: IDataService) {
    this.log = this.loggingService.getLogger('core');
  }

  public async send(channel: ChannelResolvable, content: MessageContentResolvable): Promise<OneOrMany<Message>> {
    const resolvedChannel: Channel = await this.resolveChannel(channel);

    if (!(resolvedChannel && (resolvedChannel instanceof TextChannel || resolvedChannel instanceof DMChannel || resolvedChannel instanceof NewsChannel))) {
      this.log.error('Failed to send message: Could not resolve text channel!');
      this.log.trace('Trace information:');
      return [];
    }
    const messages: Message[] = toMany(await resolvedChannel.send(content));
    const deletionNotice: Message[] = toMany(await this.sendDeletionExplainer(resolvedChannel));

    if (deletionNotice && deletionNotice.length) {
      messages.push(...deletionNotice);
    }

    await this.addDeletionReaction(messages);

    return messages;
  }

  public async reply(message: Message, content: MessageContentResolvable): Promise<OneOrMany<Message>> {
    if (!message) {
      this.log.error('Failed to delete message: Could not resolve the message object!');
      return [];
    }

    const messages: Message[] = toMany(await message.reply(content));
    const deletionNotice: Message[] = toMany(await this.sendDeletionExplainer(message.channel));

    if (deletionNotice && deletionNotice.length) {
      messages.push(...deletionNotice);
    }

    await this.addDeletionReaction(messages);

    return messages;
  }

  public async delete(message: Message): Promise<Message> {
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

  public async replyWithPaginatedEmbed(embeds: MessageEmbed[], message: Message, page: number = 0): Promise<void> {
    if (!message) {
      this.log.error('Failed to delete message: Could not resolve the message object!');
      return null;
    }

    const currentPage: number = Math.min(embeds.length, page);
    const paginatedEmbeds = new Embeds()
      .setArray(embeds)
      .setAuthorizedUsers([message.author.id])
      .setChannel(<TextChannel | DMChannel>message.channel)
      .setPageIndicator('footer')
      .setColor(await this.configurationService.get('embedColor'))
      .setDeleteOnTimeout(true)
      .setPage(currentPage)
      .on('start', () => this.log.debug('Replied with a new paginated embed.'))
      .on('finish', async (user: User) => {
        this.log.debug(`User ${user.username} finished a paginated embed.`);
        if (message.deletable) {
          await this.delete(message);
        }
      })
      .on('expire', async () => {
        this.log.debug('A paginated embed expired.');
        if (message.deletable) {
          await this.delete(message);
        }
      })
      .on('error', (error: Error) => this.log.error(error));

    return paginatedEmbeds.build();
  }

  private async sendDeletionExplainer(channel: TextChannel | DMChannel | NewsChannel): Promise<OneOrMany<Message>> {
    if (channel instanceof DMChannel) {
      return [];
    }

    const guildConfiguration: GuildConfiguration = toOne(await this.dataService.find(GuildConfiguration, {id: channel.guild.id}));
    if (!guildConfiguration.hasDeletedMessage) {
      guildConfiguration.hasDeletedMessage = true;
      guildConfiguration.save();

      return channel.send('This is the first message I\'ve sent in this guild, so you should know that if you\'d like to delete any messages I send in the future, just react with the "🗑️" emote!');
    }
    return [];
  }

  private async addDeletionReaction(messages: OneOrMany<Message>): Promise<void> {
    const manyMessages: Message[] = toMany(messages);

    return forEachAsync(manyMessages, async (message: Message): Promise<void> => {
      await message.react('🗑️');
    });
  }

  private async resolveChannel(channel: ChannelResolvable): Promise<Channel> {
    let resolvedChannel: Channel;
    if (channel instanceof Channel) {
      resolvedChannel = await channel.fetch();
    } else {
      this.clientService.getClient().channels.fetch(channel, true);
    }

    return resolvedChannel;
  }
}
