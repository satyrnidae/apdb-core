import { injectable, inject } from "inversify";
import { Command, ICommandService, ServiceIdentifiers, IConfigurationService, ILoggingService, Logger, IDataService } from "@satyrnidae/apdb-api";
import { Mutex, OneOrMany, toOne, toMany } from "@satyrnidae/apdb-utils";
import { Guild } from "discord.js";
import { GuildConfiguration } from "../../db/entity/guild-configuration";
import { CommandOptions } from "../../db/entity/command-options";
import { IAppConfiguration } from "./configuration/app-configuration";

const Commands: Command[] = [];
const CommandMutex: Mutex = new Mutex();

@injectable()
export class CommandService implements ICommandService {

  private readonly log: Logger;

  constructor(@inject(ServiceIdentifiers.Logging) loggingService: ILoggingService,
    @inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService<IAppConfiguration>,
    @inject(ServiceIdentifiers.Data) private readonly dataService: IDataService) {
    this.log = loggingService.getLogger('core');
  }

  public async get(command: string, moduleId?: string, guild?: Guild): Promise<OneOrMany<Command>> {
    const commands: Command[] = toMany(await this.getAll(moduleId, guild));

    return commands.filter(entry => entry.command === command);
  }

  public async getAll(moduleId?: string, guild?: Guild): Promise<OneOrMany<Command>> {
    let commands: Command[] = await CommandMutex.dispatch(() => Commands);

    if (moduleId) {
      commands = commands.filter(entry => entry.moduleId === moduleId);
    }

    if (guild) {
      const guildConfiguration: GuildConfiguration = toOne(await this.dataService.load<GuildConfiguration>(GuildConfiguration, { id: guild.id }, true));
      const disabledModules: string[] = guildConfiguration.moduleOptions ? guildConfiguration.moduleOptions.filter(value => value.disabled).map(value => value.moduleId) : [];
      const disabledCommands: CommandOptions[] = guildConfiguration.moduleOptions
        ? guildConfiguration.moduleOptions.filter(value => value && !value.disabled).map(value => value.commands).flat().filter(value => value.disabled) : [];

      commands = commands.filter(entry => !disabledModules.includes(entry.moduleId)
        && !(disabledCommands.filter(value => value.command === entry.command && value.module.moduleId === entry.moduleId).length));
    }

    return commands;
  }

  public async getCommandPrefix(guild: Guild): Promise<string> {
    const prefix: string = await this.configurationService.get('defaultPrefix');
    if (guild) {
      const config: GuildConfiguration = toOne(await this.dataService.load(GuildConfiguration, { id: guild.id }, true));
      return config.commandPrefix;
    }
    return prefix;
  }

  public async register(command: Command): Promise<boolean> {
    if (!command) {
      return false;
    }
    if (!command.moduleId) {
      this.log.warn('A module attempted to register a command without a module ID!');
      return false;
    }
    if (!command.command) {
      this.log.warn(`${command.moduleId} attempted to register an empty command.`);
      return false;
    }

    return CommandMutex.dispatch(async (): Promise<boolean> => {
      if (Commands.filter(registeredCommand => registeredCommand.moduleId === command.moduleId && registeredCommand.command === command.command).length) {
        console.trace(`Skipped registration of duplicate command ${command.moduleId}/${command.command}`);
        return false;
      }

      Commands.push(command);
      return true;
    });
  }
}
