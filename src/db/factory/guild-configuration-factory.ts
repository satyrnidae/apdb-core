import { GuildConfiguration } from "../entity/guild-configuration";
import { IDataEntityFactory, ServiceIdentifiers, IDataService, IConfigurationService, lazyInject } from "@satyrnidae/apdb-api";
import { OneOrMany, Mutex } from "@satyrnidae/apdb-utils";
import { Repository } from "typeorm";

export class GuildConfigurationFactory implements IDataEntityFactory<GuildConfiguration> {

  @lazyInject(ServiceIdentifiers.Data)
  private readonly dataService!: IDataService;

  @lazyInject(ServiceIdentifiers.Configuration)
  private readonly configurationService!: IConfigurationService;

  private repository: Repository<GuildConfiguration> = null;
  private readonly repositoryMutex: Mutex = new Mutex();

  public async load(args: Partial<GuildConfiguration>, save: boolean = false): Promise<OneOrMany<GuildConfiguration>> {
    const repository: Repository<GuildConfiguration> = await this.getRepository();

    const rows: GuildConfiguration[] = await repository.find(args);

    if (!rows.length
      && args.id
      && !(await repository.findOne({ id: args.id }))) {
      const guildConfiguration: GuildConfiguration = new GuildConfiguration();
      guildConfiguration.commandPrefix = args.commandPrefix || await this.configurationService.getDefaultPrefix();
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
    return this.repositoryMutex.dispatch(async () => {
      if (!this.repository) {
        this.repository = await this.dataService.getRepository(GuildConfiguration);
      }
      return this.repository;
    });
  }

}
