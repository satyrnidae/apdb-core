import { Entity, Repository, Column, PrimaryColumn } from "typeorm";
import { DataEntity, lazyInject, ServiceIdentifiers } from "@satyrnidae/apdb-api";
import { DataService } from "../../core/services/data-service";
import { Mutex } from "@satyrnidae/apdb-utils";

@Entity('core.guild_configuration')
export class GuildConfiguration extends DataEntity {
  @lazyInject(ServiceIdentifiers.Data)
  private readonly dataService!: DataService;

  private readonly repositoryMutex: Mutex = new Mutex();

  private repository: Repository<GuildConfiguration>;

  public async save(): Promise<this & GuildConfiguration> {
    const repository: Repository<GuildConfiguration> = await this.getRepository();
    return repository.save(this);
  }

  public async getRepository(): Promise<Repository<GuildConfiguration>> {
    return this.repositoryMutex.dispatch(async() => {
      if (!this.repository) {
        this.repository = await this.dataService.getRepository(GuildConfiguration);
      }
      return this.repository;
    });
  }

  @PrimaryColumn()
  id: string;

  @Column({default: '!'})
  commandPrefix: string;

  @Column({default: false})
  welcomeMessageSent: boolean;

}
