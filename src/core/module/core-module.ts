import { Module, Logger, Container, Command, EventHandler, IModulePackage, IModulePackageDetails } from "@satyrnidae/apdb-api";
import { CoreMessageService } from "./services/core-message-service";
import { ReadyHandler } from "./events/ready-handler";
import { CommandHandler } from "./events/command-handler";
import { HelpCommand } from "./commands/help-command";
import { DeleteInteractionHandler } from "./events/delete-interaction-handler";
import { Candidates } from "../../core/services/module/candidate-validation";
import { SetPrefixCommand } from "./commands/set-prefix-command";
import { CommandInteractionHandler } from "./events/command-interaction-handler";
import { InviteCommand } from "./commands/invite-command";

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
      Container.resolve(HelpCommand),
      Container.resolve(SetPrefixCommand),
      Container.resolve(InviteCommand)
    ]);
    this.events.push(...[
      Container.resolve(ReadyHandler),
      Container.resolve(CommandHandler),
      Container.resolve(DeleteInteractionHandler),
      Container.resolve(CommandInteractionHandler)
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