import { injectable, inject } from "inversify";
import { IClientService, ServiceIdentifiers, IConfigurationService } from "@satyrnidae/apdb-api";
import { Client } from "discord.js";
import { IAppConfiguration } from "./configuration/app-configuration";

const TheClient: Client = new Client();

@injectable()
export class ClientService implements IClientService {

  constructor(@inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService<IAppConfiguration>) { }

  public async login(): Promise<string> {
    return TheClient.login(await this.configurationService.get('token'));
  }

  public getClient(): Client {
    return TheClient;
  }

}
