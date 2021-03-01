import { Entity, Repository, PrimaryColumn, Column, ManyToOne } from "typeorm";
import { lazyInject, ServiceIdentifiers, DataEntity, IDataService } from "@satyrnidae/apdb-api";
import { GuildConfiguration } from "./guild-configuration";

@Entity({name: 'module_options', schema: 'core'})
export class ModuleOptions extends DataEntity {
  @lazyInject(ServiceIdentifiers.Data)
  private readonly dataService!: IDataService;

  public async save(): Promise<this & ModuleOptions> {
    const repository: Repository<ModuleOptions> = await this.getRepository();
    return repository.save(this);
  }

  public async getRepository(): Promise<Repository<ModuleOptions>> {
    return this.dataService.getRepository(ModuleOptions);
  }

  @PrimaryColumn()
  id: string;

  @ManyToOne(() => GuildConfiguration, guildConfiguration => guildConfiguration.moduleOptions)
  guild: GuildConfiguration;

  @Column({nullable: false})
  moduleId: string;

  @Column({nullable: false, default: false})
  disabled: boolean;
}