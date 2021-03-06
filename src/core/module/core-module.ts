import { Module, Logger, Container, Command, EventHandler } from "@satyrnidae/apdb-api";
import { CoreMessageService } from "./services/core-message-service";
import { ReadyHandler } from "./events/ready-handler";
import { CommandHandler } from "./events/command-handler";
import { HelpCommand } from "./commands/help-command";
import { DeleteReactionHandler } from "./events/delete-reaction-handler";

export class CoreModule extends Module {

  private readonly coreCommands: Command[] = [];
  private readonly coreEvents: EventHandler<any>[] = [];

  constructor(log: Logger) {
    super({
      name: 'Core Module',
      id: 'core',
      version: (global as any).version,
      details: {
        apiVersion: (global as any).apiVersion,
        authors: ['satyrnidae'],
        containerName: 'apdb-core',
        description: 'The core functionality for the APDB Framework',
        entryPoint: 'bin/app.js',
        path: './',
        website: 'https://github.com/satyrnidae/apdb-core'
      }
    }, log);
  }

  public async registerDependencies(): Promise<void> {
    Container.bind(CoreMessageService).toSelf();
  }

  public async preInitialize(): Promise<void> {
    this.commands.push(...[
      new HelpCommand('core')
    ]);
    this.events.push(...[
      new ReadyHandler('core'),
      new CommandHandler('core'),
      new DeleteReactionHandler('core')
    ]);
  }

  public async initialize() {}

  public async postInitialize(): Promise<void> {
    this.log.info('Initialized core module components.');
  }

  get commands(): Command[] {
    return this.coreCommands;
  }

  get events(): EventHandler<any>[] {
    return this.coreEvents;
  }
}