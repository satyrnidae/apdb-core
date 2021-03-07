import { GuildConfiguration } from "../entity/guild-configuration";
import { IDataEntityFactory, ServiceIdentifiers, IDataService, IConfigurationService, lazyInject, IModuleService } from "@satyrnidae/apdb-api";
import { OneOrMany } from "@satyrnidae/apdb-utils";
import { Repository } from "typeorm";
import { IAppConfiguration } from "../../core/services/configuration/app-configuration";

export class GuildConfigurationFactory implements IDataEntityFactory<GuildConfiguration> {

  @lazyInject(ServiceIdentifiers.Data)
  private readonly dataService!: IDataService;
  @lazyInject(ServiceIdentifiers.Configuration)
  private readonly configurationService!: IConfigurationService<IAppConfiguration>;
  @lazyInject(ServiceIdentifiers.Module)
  private readonly moduleService!: IModuleService;

  public async load(args: Partial<GuildConfiguration>, save: boolean = false): Promise<OneOrMany<GuildConfiguration>> {
    const repository: Repository<GuildConfiguration> = await this.getRepository();

    const rows: GuildConfiguration[] = await repository.find({
      cache: true,
      where: { id: args.id }
    });

    if (!rows.length && args.id) {
      const guildConfiguration: GuildConfiguration = new GuildConfiguration();
      guildConfiguration.commandPrefix = args.commandPrefix || await this.configurationService.get('defaultPrefix');
      guildConfiguration.welcomeMessageSent = args.welcomeMessageSent;
      guildConfiguration.id = args.id;

      if (save) {
        await guildConfiguration.save();
      }
      return guildConfiguration;
    }
    return rows;
  }

  public async getRepository(): Promise<Repository<GuildConfiguration>> {
    return this.dataService.getRepository(GuildConfiguration);
  }
}
