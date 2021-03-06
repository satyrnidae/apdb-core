import { Entity, Repository, PrimaryColumn, ManyToOne, Column } from "typeorm";
import { lazyInject, ServiceIdentifiers, IDataService, DataEntity } from "@satyrnidae/apdb-api";
import { ModuleOptions } from "./module-options";

@Entity({name: 'core_guildcommandoptions', schema: 'core'})
export class CommandOptions extends DataEntity {
  @lazyInject(ServiceIdentifiers.Data)
  private readonly dataService!: IDataService;

  public async save(): Promise<this & CommandOptions> {
    const repository: Repository<CommandOptions> = await this.getRepository();
    return repository.save(this);
  }

  public async getRepository(): Promise<Repository<CommandOptions>> {
    return this.dataService.getRepository(CommandOptions);
  }

  @PrimaryColumn()
  id: string;

  @Column()
  command: string;

  @ManyToOne(() => ModuleOptions, moduleOptions => moduleOptions.commands)
  module: ModuleOptions;

  @Column({nullable: false, default: false})
  disabled: boolean;
}
