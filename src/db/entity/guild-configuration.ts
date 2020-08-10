import { Entity, Repository, Column, PrimaryColumn } from "typeorm";
import { DataEntity, lazyInject, ServiceIdentifiers } from "@satyrnidae/apdb-api";
import { DataService } from "../../core/services/data-service";

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

}
