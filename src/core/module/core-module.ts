import { Module, Logger, Container, Command, EventHandler, IModulePackage, IModulePackageDetails } from "@satyrnidae/apdb-api";
import { CoreMessageService } from "./services/core-message-service";
import { ReadyHandler } from "./events/ready-handler";
import { CommandHandler } from "./events/command-handler";
import { HelpCommand } from "./commands/help-command";
import { DeleteReactionHandler } from "./events/delete-reaction-handler";
import { Candidates } from "../../core/services/module/candidate-validation";

export class CoreModule extends Module {

  private readonly coreCommands: Command[] = [];
  private readonly coreEvents: EventHandler<any>[] = [];

  constructor(log: Logger) {
    super(
      Candidates.constructModuleInfo(
        (global as any).packageInfo as IModulePackage,
        <IModulePackageDetails>{
          name: 'Another Pluggable Discord Bot Core Components',
          id: 'core'
        }), log);
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