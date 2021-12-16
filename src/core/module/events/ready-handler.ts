import { EventHandler, ServiceIdentifiers, IClientService, IEventService, ILoggingService, Logger, IConfigurationService, IModuleService, Module, ICommandService, Command, CommandOption, SlashOrMessageCommand, SlashCommand } from "@satyrnidae/apdb-api";
import { CoreMessageService } from "../services/core-message-service";
import { Client } from "discord.js";
import { IAppConfiguration } from "../../../core/services/configuration/app-configuration";
import { injectable } from "inversify";
import { inject } from "inversify";
import { forEachAsync, toMany } from "@satyrnidae/apdb-utils";
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

@injectable()
export class ReadyHandler extends EventHandler<'ready'> {

  constructor(@inject(CoreMessageService) private readonly coreMessageService: CoreMessageService,
              @inject(ServiceIdentifiers.Client) private readonly clientService: IClientService,
              @inject(ServiceIdentifiers.Event) private readonly eventService: IEventService,
              @inject(ServiceIdentifiers.Logging) private readonly loggingService: ILoggingService,
              @inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService<IAppConfiguration>,
              @inject(ServiceIdentifiers.Module) private readonly moduleService: IModuleService,
              @inject(ServiceIdentifiers.Command) private readonly commandService: ICommandService) {
    super('ready', 'core');
  }

  public async handler(): Promise<void> {
    const log: Logger = this.loggingService.getLogger('core');
    const client: Client = this.clientService.getClient();
    const prefix: string = await this.configurationService.get('defaultPrefix');
    this.eventService.on('error', (e: Error) => log.error(e.stack));
    this.eventService.on('warn', (w: string) => log.warn(w));
    this.eventService.on('debug', (i: string) => log.debug(i));

    // Set presence for global help command
    client.user.setActivity(`${prefix}help`, {type: 'LISTENING'});

    // Set the core module thumbnail to match the logged-in user profile picture
    const coreModule: Module = await this.moduleService.getModuleById(this.moduleId);
    coreModule.moduleInfo.details.thumbnail = client.user.avatarURL();

    log.info(`Logged in as ${client.user.tag}`);

    const promises: Promise<void>[] = [];
    client.guilds.cache.forEach((element) => {
      promises.push(this.coreMessageService.sendGuildWelcomeMessage.bind(this.coreMessageService)(element.id));
    });

    promises.push(new Promise(async (resolve, reject) => {
      const data = [];

      const promises = (toMany(await this.commandService.getAll())
        .filter(command => command instanceof SlashOrMessageCommand || command instanceof SlashCommand)
        .map(command => (<SlashOrMessageCommand | SlashCommand>command).asSlashCommand()));

      const slashCommands = await Promise.all(promises);

      data.push(...slashCommands);

      const rest = new REST({ version: '9' }).setToken(await this.configurationService.get('token'));
      await rest.put(
        Routes.applicationCommands(this.clientService.getClient().application.id),
        { body: data }
      );
    }));

    return new Promise<void> ((resolve, reject) => Promise.all(promises).then(() => resolve(), reject));
  }
}
