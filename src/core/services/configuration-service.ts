import { IConfigurationService } from '@satyrnidae/apdb-api';
import { IAppConfiguration } from './configuration/app-configuration';
import { fsa, Mutex } from '@satyrnidae/apdb-utils';
import { injectable } from 'inversify';

let Config: IAppConfiguration = null;
const ConfigMutex: Mutex = new Mutex();
@injectable()
export class ConfigurationService implements IConfigurationService<IAppConfiguration> {

  public async get<E extends keyof IAppConfiguration>(key: E): Promise<IAppConfiguration[E]> {
    const config: IAppConfiguration = await this.loadConfig();
    return config[key];
  }

  public async loadConfig(): Promise<IAppConfiguration> {
    return ConfigMutex.dispatch(async () => {
      if (!Config) {
        const configPath: string = (global as any).configPath;
        const configExists: boolean = await fsa.existsAsync(configPath);
        if (!configExists) {
          throw new Error(`Config file does not exist: ${configPath}`);
        }
        const configData: Buffer = await fsa.readFileAsync(configPath);
        Config = JSON.parse(configData.toString()) as IAppConfiguration;
      }
      return Config;
    });
  }
}
