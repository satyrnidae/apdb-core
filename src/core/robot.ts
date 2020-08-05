import { injectable, inject } from "inversify";
import { ServiceIdentifiers, IModuleService, ILifecycle, IClientService } from '@satyrnidae/apdb-api';

@injectable()
export class Robot implements ILifecycle {

    public constructor (@inject(ServiceIdentifiers.Module) private readonly moduleService: IModuleService,
      @inject(ServiceIdentifiers.Client) private readonly clientService: IClientService) { }

    public async preInitialize() : Promise<void> {
        return this.moduleService.preInitialize();
    }

    public async initialize() : Promise<void> {
        return this.moduleService.initialize();
    }

    public async postInitialize() : Promise<void> {
        return this.moduleService.postInitialize();
    }

    public async run() : Promise<any> {
        return this.clientService.login();
    }
}
