import { EventHandler, ServiceIdentifiers, IClientService, IEventService, ILoggingService, lazyInject, Logger } from "@satyrnidae/apdb-api";
import { CoreMessageService } from "../services/core-message-service";
import { Client } from "discord.js";
import { forEachAsync } from "@satyrnidae/apdb-utils";

export class ReadyHandler extends EventHandler<'ready'> {
  @lazyInject(CoreMessageService)
  private readonly messageService!: CoreMessageService;

  @lazyInject(ServiceIdentifiers.Client)
  private readonly clientService!: IClientService;

  @lazyInject(ServiceIdentifiers.Event)
  private readonly eventService!: IEventService;

  @lazyInject(ServiceIdentifiers.Logging)
  private readonly loggingService!: ILoggingService;

  constructor(moduleId: string) {
    super('ready', moduleId);
  }

  public async handler(): Promise<void> {
    const log: Logger = this.loggingService.getLogger('core');
    const client: Client = this.clientService.getClient();
    this.eventService.on('error', (e: Error) => log.error(e));
    this.eventService.on('warn', (w: string) => log.warn(w));
    this.eventService.on('debug', (i: string) => log.debug(i));

    log.info(`Logged in as ${client.user.tag}`);

    return forEachAsync(client.guilds.cache.array(), this.messageService.sendGuildWelcomeMessage.bind(this.messageService));
  }
}
