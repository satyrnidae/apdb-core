import { ServiceIdentifiers, IConfigurationService, ICommandService, Command, Logger, ILoggingService, EventHandler, IMessageService, IModuleDetails, IModuleService, SlashCommand, SlashOrMessageCommand } from "@satyrnidae/apdb-api";
import { CoreMessageService } from "../services/core-message-service";
import { parse } from 'discord-command-parser';
import { ApplicationCommandOption, Interaction, Message } from "discord.js";
import { toOne } from "@satyrnidae/apdb-utils";
import yparser, { Arguments } from 'yargs-parser';
import { IAppConfiguration } from "../../services/configuration/app-configuration";
import { inject } from "inversify";
import { injectable } from "inversify";

@injectable()
export class CommandInteractionHandler extends EventHandler<'interactionCreate'> {

  private readonly log: Logger;

  constructor(@inject(ServiceIdentifiers.Command) private readonly commandService: ICommandService,
              @inject(ServiceIdentifiers.Logging) private readonly loggingService: ILoggingService) {
    super('interactionCreate', 'core');
    this.log = loggingService.getLogger('core');
  }

  public async handler(interaction: Interaction) {
    if (!interaction.isCommand()) return;

    const command: Command = toOne(await this.commandService.get(interaction.commandName));
    if (command && (command instanceof SlashCommand || command instanceof SlashOrMessageCommand)) {
      try {
        command.execute(interaction);
      } catch (err) {
        this.log.error(err);
      }
    }
  }
}
