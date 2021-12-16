import { EventHandler, ServiceIdentifiers, ILoggingService, Logger, IMessageService, IClientService } from "@satyrnidae/apdb-api";
import { forEachAsync } from "@satyrnidae/apdb-utils";
import { MessageReaction, Interaction, Client, TextChannel, Message, ButtonInteraction } from "discord.js";
import { injectable } from "inversify";
import { inject } from "inversify";

//TODO: Will be replaced w/ button
@injectable()
export class DeleteInteractionHandler extends EventHandler<'interactionCreate'> {

  private readonly log: Logger;

  constructor(@inject(ServiceIdentifiers.Client) private readonly clientService: IClientService,
              @inject(ServiceIdentifiers.Logging) loggingService: ILoggingService,
              @inject(ServiceIdentifiers.Message) private readonly messageService: IMessageService) {
    super('interactionCreate', 'core');
    this.log = loggingService.getLogger(this.moduleId);
  }

  public async handler(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;

    if (interaction.customId == 'deleteMessage') {
      const client = this.clientService.getClient();
      const channel = (await client.channels.fetch(interaction.channelId)) as TextChannel;

      if (!channel) return;

      const messages: Message[] = [];

      const interactionMessage: Message = await channel.messages.fetch(interaction.message.id)
      messages.push(interactionMessage);
      if (interactionMessage.reference?.messageId) {
        const repliedTo: Message = await channel.messages.fetch(interactionMessage.reference.messageId);
        if (repliedTo) {
          messages[0] = repliedTo;
          messages.push(interactionMessage);
        }
      }

      return forEachAsync(messages, async (current) => {
        this.log.debug(`Deleting message ${current.id} in channel ${channel.name}...`);
        await this.messageService.delete(current);
      })
    }
  }
}
