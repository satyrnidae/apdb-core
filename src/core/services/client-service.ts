import { injectable, inject } from "inversify";
import { IClientService, ServiceIdentifiers, IConfigurationService } from "@satyrnidae/apdb-api";
import { Client, Intents } from "discord.js";
import { IAppConfiguration } from "./configuration/app-configuration";

const TheClient: Client = new Client({intents: [
  Intents.FLAGS.DIRECT_MESSAGES,
  Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  Intents.FLAGS.GUILD_PRESENCES
]});

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
