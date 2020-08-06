import { injectable, inject } from "inversify";
import { Command, ICommandService, ServiceIdentifiers, IConfigurationService, ILoggingService, Logger } from "@satyrnidae/apdb-api";
import { Mutex, OneOrMany } from "@satyrnidae/apdb-utils";
import { Guild } from "discord.js";

const Commands: Command[] = [];
const CommandMutex: Mutex = new Mutex();

@injectable()
export class CommandService implements ICommandService {

  private readonly log: Logger;

  constructor(@inject(ServiceIdentifiers.Logging) loggingService: ILoggingService,
    @inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService) {
    this.log = loggingService.getLogger('core');
  }

  public async get(command: string, moduleId?: string): Promise<OneOrMany<Command>> {
    if (moduleId) {
      return CommandMutex.dispatch(() => Commands.filter(entry => entry.moduleId === moduleId && entry.command === command));
    }
    return CommandMutex.dispatch(() => Commands.filter(entry => entry.command === command)
    );
  }

  public async getAll(moduleId?: string): Promise<OneOrMany<Command>> {
    if (moduleId) {
      return CommandMutex.dispatch(() => Commands.filter(entry => entry.moduleId === moduleId));
    }
    return CommandMutex.dispatch(() => Commands);
  }

  public async getCommandPrefix(guild: Guild): Promise<string> {
    let prefix: string = await this.configurationService.getDefaultPrefix();
    if (guild) {
      // load guild config
      prefix = '!';
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
