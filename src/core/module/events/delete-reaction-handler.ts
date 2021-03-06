import { EventHandler, lazyInject, ServiceIdentifiers, ILoggingService, Logger, IMessageService, IClientService } from "@satyrnidae/apdb-api";
import { MessageReaction, PartialUser, User, Client, TextChannel, Message } from "discord.js";

export class DeleteReactionHandler extends EventHandler<'messageReactionAdd'> {

  @lazyInject(ServiceIdentifiers.Client)
  private readonly clientService!: IClientService;

  @lazyInject(ServiceIdentifiers.Logging)
  private readonly loggingService!: ILoggingService;

  @lazyInject(ServiceIdentifiers.Message)
  private readonly messageService!: IMessageService;

  constructor(moduleId: string) {
    super('messageReactionAdd', moduleId);
  }

  public async handler(messageReaction: MessageReaction, user: User | PartialUser) {
    const fullUser: User = await user.fetch();
    const log: Logger = this.loggingService.getLogger('core');
    const me: User = this.clientService.getClient().user;

    if(fullUser.equals(me)) {
      log.debug('I reacted to my own self-posted message');
      // Do not process my own reactions.
      return;
    }
    if(!messageReaction.message.author.equals(me)) {
      log.debug(`Skipped attempted deletion of a message i didn't write by user ${fullUser.tag}`);
      return;
    }
    // emojis are stupid as fuck so here have both options christ
    if ((messageReaction.emoji.name === '🗑️' || messageReaction.emoji.name === '🗑') && messageReaction.message.deletable) {
      log.debug(`User ${fullUser.tag} deleted a bot-generated message!`);
      try {
        //TODO: When upgrading to v13 make sure to delete the replied message too
        await this.messageService.delete(messageReaction.message);
      } catch (err) {
        log.error(`Oops! Failed to delete a message. Perhaps permissions are incorrect?`);
        log.trace(err);
      }
    }
  }

  public async handleRaw(packet: any) {
    // Handle only raw MESSAGE_REACTION_ADD
    if (packet.t !== 'MESSAGE_REACTION_ADD') {
      return;
    }
    const client: Client = this.clientService.getClient();
    const channel: TextChannel = client.channels.cache.get(packet.d.channel_id) as TextChannel;

    // Handle only for uncached messages
    if (!channel || channel.messages.cache.has(packet.d.message_id)) {
      return;
    }

    const message: Message = await channel.messages.fetch(packet.d.message_id);

    const emoji: string = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
    const reaction: MessageReaction = message.reactions.cache.get(emoji);

    if (reaction) {
      reaction.users.cache.set(packet.d.user_id, client.users.cache.get(packet.d.user_id));
    }

    client.emit(this.event, reaction, client.users.cache.get(packet.d.user_id));
  }
}
