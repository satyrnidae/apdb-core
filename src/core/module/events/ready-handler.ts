import { EventHandler, ServiceIdentifiers, IClientService, IEventService, ILoggingService, lazyInject, Logger, IConfigurationService, IModuleService, Module } from "@satyrnidae/apdb-api";
import { CoreMessageService } from "../services/core-message-service";
import { Client } from "discord.js";
import { forEachAsync } from "@satyrnidae/apdb-utils";
import { IAppConfiguration } from "../../../core/services/configuration/app-configuration";

export class ReadyHandler extends EventHandler<'ready'> {
  @lazyInject(CoreMessageService)
  private readonly messageService!: CoreMessageService;

  @lazyInject(ServiceIdentifiers.Client)
  private readonly clientService!: IClientService;

  @lazyInject(ServiceIdentifiers.Event)
  private readonly eventService!: IEventService;

  @lazyInject(ServiceIdentifiers.Logging)
  private readonly loggingService!: ILoggingService;

  @lazyInject(ServiceIdentifiers.Configuration)
  private readonly configurationService!: IConfigurationService<IAppConfiguration>;

  @lazyInject(ServiceIdentifiers.Module)
  private readonly moduleService!: IModuleService;

  constructor(moduleId: string) {
    super('ready', moduleId);
  }

  public async handler(): Promise<void> {
    const log: Logger = this.loggingService.getLogger('core');
    const client: Client = this.clientService.getClient();
    const prefix: string = await this.configurationService.get('defaultPrefix');
    this.eventService.on('error', (e: Error) => log.error(e));
    this.eventService.on('warn', (w: string) => log.warn(w));
    this.eventService.on('debug', (i: string) => log.debug(i));

    // Set presence for global help command
    client.user.setActivity(`${prefix}help`, {type: 'LISTENING'});

    // Set the core module thumbnail to match the logged-in user profile picture
    const coreModule: Module = await this.moduleService.getModuleById(this.moduleId);
    coreModule.moduleInfo.details.thumbnail = client.user.avatarURL();

    log.info(`Logged in as ${client.user.tag}`);

    return forEachAsync(client.guilds.cache.array(), this.messageService.sendGuildWelcomeMessage.bind(this.messageService));
  }
}
