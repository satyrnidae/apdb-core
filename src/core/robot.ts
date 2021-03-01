import { injectable, inject } from "inversify";
import { ServiceIdentifiers, IModuleService, ILifecycle, IClientService, ILoggingService, IDataService, Logger } from '@satyrnidae/apdb-api';

@injectable()
export class Robot implements ILifecycle {

  private log: Logger;

  public constructor(@inject(ServiceIdentifiers.Module) private readonly moduleService: IModuleService,
    @inject(ServiceIdentifiers.Client) private readonly clientService: IClientService,
    @inject(ServiceIdentifiers.Logging) private readonly loggingService: ILoggingService,
    @inject(ServiceIdentifiers.Data) private readonly dataService: IDataService) {

      this.log = loggingService.getLogger('core');
    }

  public async preInitialize(): Promise<void> {
    return this.moduleService.preInitialize();
  }

  public async initialize(): Promise<void> {
    return this.moduleService.initialize();
  }

  public async postInitialize(): Promise<void> {
    return this.moduleService.postInitialize();
  }

  public async run(): Promise<any> {
    this.log.info('Connecting to database...')
    await this.dataService.getConnection();

    return this.clientService.login();
  }
}
