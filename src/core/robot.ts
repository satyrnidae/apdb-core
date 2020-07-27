import { injectable, inject } from "inversify";
import { Lifecycle, ServiceIdentifiers, ClientService, ModuleService } from '@satyrnidae/apdb-api';

@injectable()
export class Robot implements Lifecycle {

    public constructor (//@inject(ServiceIdentifiers.Client) private clientService: ClientService,
                        @inject(ServiceIdentifiers.Module) private moduleService: ModuleService) { }

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
        //return this.clientService.login();
    }
}