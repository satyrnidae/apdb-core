import { Entity, Repository, Column, PrimaryColumn, OneToMany } from "typeorm";
import { DataEntity, lazyInject, ServiceIdentifiers } from "@satyrnidae/apdb-api";
import { DataService } from "../../core/services/data-service";
import { ModuleOptions } from "./module-options";
@Entity({name: 'guild_configuration', schema: 'core'})
export class GuildConfiguration extends DataEntity {
  @lazyInject(ServiceIdentifiers.Data)
  private readonly dataService!: DataService;

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

  @Column({default: 'en'})
  language: string;

  @OneToMany(() => ModuleOptions, moduleOptions => moduleOptions.guild)
  moduleOptions: ModuleOptions[];
}
