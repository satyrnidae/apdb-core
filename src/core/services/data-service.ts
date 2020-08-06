import { injectable, inject } from "inversify";
import { IDataService, IDataEntityFactory, DataEntity, FactoryRegistry, ServiceIdentifiers, ILoggingService, Logger } from "@satyrnidae/apdb-api";
import { RepositoryTarget, Mutex, OneOrMany } from "@satyrnidae/apdb-utils";
import { Repository, Connection, createConnection, FindConditions } from "typeorm";

let DataSource: Connection;
const DataSourceMutex: Mutex = new Mutex();

const Factories: FactoryRegistry = {};
const FactoryMutex: Mutex = new Mutex();

@injectable()
export class DataService implements IDataService {

  private readonly log: Logger;

  constructor(@inject(ServiceIdentifiers.Logging) loggingService: ILoggingService) {
    this.log = loggingService.getLogger('core');
  }

  public async getRepository<T>(target: RepositoryTarget<T>): Promise<Repository<T>> {
    return (await this.getConnection()).getRepository<T>(target);
  }

  public async registerFactory<T extends DataEntity>(result: new () => T, factory: (new () => IDataEntityFactory<T>)): Promise<void> {
    return FactoryMutex.dispatch(() => {
      const type: (new () => IDataEntityFactory<any>) = Factories[result.name];
      if (type) {
        throw new Error(`Data factory bind failed: data factory ${type.name} for type ${result.name} was already registered when registering ${factory.name}`);
      }
      Factories[result.name] = factory;
    });
  }

  public async getFactory<T extends DataEntity>(result: new () => T): Promise<IDataEntityFactory<T>> {
    return FactoryMutex.dispatch(() => {
      const type: (new () => IDataEntityFactory<T>) = Factories[result.name];
      return type ? new type() : null;
    });
  }

  public async load<T extends DataEntity>(result: new () => T, query: Partial<T>, save: boolean = false): Promise<OneOrMany<T>> {
    const factory = await this.getFactory(result);
    if (!factory) {
      throw new Error(`No factory was registered for ${result.name}.`)
    }

    return factory.load(query, save);
  }

  public async find<T extends DataEntity>(result: new () => T, query: FindConditions<T>): Promise<OneOrMany<T>> {
    const repository: Repository<T> = await this.getRepository(result);
    if (!repository) {
      throw new Error(`Failed to qcquire repository for ${result.name}.`);
    }
    return repository.find(query);
  }

  private async getConnection(): Promise<Connection> {
    return DataSourceMutex.dispatch<Connection>(async () => {
      if (!DataSource) {
        DataSource = await createConnection();
      }
      return DataSource;
    });
  }
}
