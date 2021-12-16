import { Entity, Repository, Column, PrimaryColumn, OneToMany } from "typeorm";
import { DataEntity, IDataService, ServiceIdentifiers } from "@satyrnidae/apdb-api";
import { ModuleOptions } from "./module-options";
import { inject } from "inversify";
import { injectable } from "inversify";

@injectable()
@Entity({name: 'core_guildconfiguration', schema: 'core'})
export class GuildConfiguration extends DataEntity {
  constructor(@inject(ServiceIdentifiers.Data) private readonly dataService: IDataService) {
    super();
  }

  public async save(): Promise<this & GuildConfiguration> {
    const repository: Repository<GuildConfiguration> = await this.getRepository();
    return repository.save(this);
  }

  public async getRepository(): Promise<Repository<GuildConfiguration>> {
    return this.dataService.getRepository(GuildConfiguration);
  }

  @PrimaryColumn()
  id: string;

  @Column({default: '!'})
  commandPrefix: string;

  @Column({default: false})
  welcomeMessageSent: boolean;

  @Column({default: false})
  hasDeletedMessage: boolean;

  @Column({default: 'en'})
  language: string;

  @OneToMany(() => ModuleOptions, moduleOptions => moduleOptions.guild)
  moduleOptions: ModuleOptions[];
}
