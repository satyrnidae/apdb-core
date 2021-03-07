import { injectable, inject } from "inversify";
import { ServiceIdentifiers, Logger, ILoggingService, IConfigurationService, IClientService, IDataService, IMessageService } from "@satyrnidae/apdb-api";
import { Guild, Client, GuildMember, TextChannel, Message } from "discord.js";
import { GuildConfiguration } from "../../../db/entity/guild-configuration";
import { toOne, OneOrMany } from "@satyrnidae/apdb-utils";
import { IAppConfiguration } from "../../services/configuration/app-configuration";

@injectable()
export class CoreMessageService {
  // this is gonna be hell
  private readonly log: Logger;
  private readonly client: Client;

  constructor(@inject(ServiceIdentifiers.Data) private readonly dataService: IDataService,
    @inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService<IAppConfiguration>,
    @inject(ServiceIdentifiers.Logging) loggingService: ILoggingService,
    @inject(ServiceIdentifiers.Client) clientService: IClientService,
    @inject(ServiceIdentifiers.Message) private readonly messageService: IMessageService) {
    this.log = loggingService.getLogger('core');
    this.client = clientService.getClient();
  }

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

  private async sendWelcomeMessage(me: GuildMember, channel: TextChannel, commandPrefix: string): Promise<OneOrMany<Message>> {
    const text: string = `Hello everyone! ${me.displayName} here.\r\n` +
      `I'm a modular bot framework, with a potential variety of functions!\r\n` +
      `Feel free to ask for \`${commandPrefix}help\` if you're interested in learning more!`;
    return this.messageService.send(channel, text);
  }
}
