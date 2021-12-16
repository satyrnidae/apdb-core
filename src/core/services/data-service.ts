import { injectable, interfaces } from "inversify";
import { IDataService, IDataEntityFactory, DataEntity, FactoryRegistry, Container } from "@satyrnidae/apdb-api";
import { RepositoryTarget, Mutex, OneOrMany } from "@satyrnidae/apdb-utils";
import { Repository, Connection, createConnection, FindConditions } from "typeorm";

let DataSource: Connection;
const DataSourceMutex: Mutex = new Mutex();

const Factories: FactoryRegistry = {};
const FactoryMutex: Mutex = new Mutex();

@injectable()
export class DataService implements IDataService {

  public async getRepository<T>(target: RepositoryTarget<T>): Promise<Repository<T>> {
    return (await this.getConnection()).getRepository<T>(target);
  }

  public async registerFactory<T extends DataEntity>(result: interfaces.Newable<T>, factory: interfaces.Newable<IDataEntityFactory<T>>): Promise<void> {
    return FactoryMutex.dispatch(() => {
      const type: interfaces.Newable<IDataEntityFactory<T>> = Factories[result.name];
      if (type) {
        throw new Error(`Data factory bind failed: data factory ${type.name} for type ${result.name} was already registered when registering ${factory.name}`);
      }
      Factories[result.name] = factory;
    });
  }

  public async getFactory<T extends DataEntity>(result: interfaces.Newable<T>): Promise<IDataEntityFactory<T>> {
    return FactoryMutex.dispatch(() => {
      const type: interfaces.Newable<IDataEntityFactory<T>> = Factories[result.name];
      return type ? Container.resolve(type) : null;
    });
  }

  public async load<T extends DataEntity>(result: interfaces.Newable<T>, query: Partial<T>, save: boolean = false): Promise<OneOrMany<T>> {
    const factory = await this.getFactory(result);
    if (!factory) {
      throw new Error(`No factory was registered for ${result.name}.`);
    }

    return factory.load(query, save);
  }

  public async find<T extends DataEntity>(result: interfaces.Newable<T>, query: FindConditions<T>): Promise<OneOrMany<T>> {
    const repository: Repository<T> = await this.getRepository(result);
    if (!repository) {
      throw new Error(`Failed to acquire repository for ${result.name}.`);
    }
    return repository.find(query);
  }

  public async getConnection(): Promise<Connection> {
    return DataSourceMutex.dispatch<Connection>(async () => {
      if (!DataSource) {
        DataSource = await createConnection();
      }
      return DataSource;
    });
  }
}
