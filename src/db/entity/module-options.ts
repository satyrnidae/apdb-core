import { Entity, Repository, PrimaryColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { ServiceIdentifiers, DataEntity, IDataService } from "@satyrnidae/apdb-api";
import { GuildConfiguration } from "./guild-configuration";
import { CommandOptions } from './command-options';
import { inject } from "inversify";
import { injectable } from "inversify";

@injectable()
@Entity({name: 'core_guildmoduleoptions', schema: 'core'})
export class ModuleOptions extends DataEntity {
  constructor(@inject(ServiceIdentifiers.Data) private readonly dataService: IDataService) {
    super();
  }

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

  @OneToMany(() => CommandOptions, commandOptions => commandOptions.module)
  commands: CommandOptions[];
}
