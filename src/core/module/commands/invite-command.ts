import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { IConfigurationService, ILoggingService, Logger, ServiceIdentifiers, SlashOrMessageCommand } from "@satyrnidae/apdb-api";
import { OneOrMany } from "@satyrnidae/apdb-utils";
import { Guild, CommandInteraction, CacheType, Message } from "discord.js";
import { inject, injectable } from "inversify";
import { Options, Arguments } from "yargs-parser";
import { CoreMessageService } from "../services/core-message-service";

@injectable()
export class InviteCommand extends SlashOrMessageCommand {
  public readonly name: string = 'invite';
  public readonly friendlyName: string = 'Invite';
  public readonly description: string = 'Generate a link to invite the bot to your server.';
  public readonly syntax: OneOrMany<string> = 'invite';
  public readonly options: Options = {};

  private readonly log: Logger;

  constructor(@inject(ServiceIdentifiers.Logging) loggingService: ILoggingService,
              @inject(CoreMessageService) private readonly coreMessageService) {
    super('core');
    this.log = loggingService.getLogger(this.moduleId);
  }

  public async asSlashCommand(guild?: Guild): Promise<SlashCommandBuilder | SlashCommandSubcommandBuilder> {
    return this.slashCommandBuilder;
  }

  public async execute(target: Message | CommandInteraction, args?: Arguments): Promise<any> {
    this.log.debug('Invite link requested, sending...');
    return this.coreMessageService.sendInviteLink(target);
  }

}