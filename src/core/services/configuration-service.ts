import { IAppConfiguration, IConfigurationService } from '@satyrnidae/apdb-api';
import { fsa, Mutex } from '@satyrnidae/apdb-utils';
import { injectable } from 'inversify';
import { ColorResolvable } from 'discord.js';

let Config: IAppConfiguration = null;
const ConfigMutex: Mutex = new Mutex();

@injectable()
export class ConfigurationService implements IConfigurationService {
  public async getToken(): Promise<string> {
    const config: IAppConfiguration = await this.loadConfig();
    return config.token;
  }
  public async getDefaultPrefix(): Promise<string> {
    const config: IAppConfiguration = await this.loadConfig();
    return config.defaultPrefix;
  }
  public async getDefaultNickname(): Promise<string> {
    const config: IAppConfiguration = await this.loadConfig();
    return config.defaultNickname;
  }
  public async getHearts(): Promise<string[]> {
    const config: IAppConfiguration = await this.loadConfig();
    return config.hearts;
  }
  public async shouldShowWelcomeMessage(): Promise<boolean> {
    const config: IAppConfiguration = await this.loadConfig();
    return config.showWelcomeMessage;
  }
  public async isDeveloperMode(): Promise<boolean> {
    const config: IAppConfiguration = await this.loadConfig();
    return config.developerMode;
  }
  public async getRandomHeart(): Promise<string> {
    const hearts: string[] = await this.getHearts();
    const index: number = Math.floor(Math.random() * hearts.length);
    return `:${hearts[index]}:`;
  }

  public async getModuleDirectories(): Promise<string[]> {
    const config: IAppConfiguration = await this.loadConfig();
    return config.moduleDirectories;
  }

  public async getBotEmbedColor(): Promise<ColorResolvable> {
    const config: IAppConfiguration = await this.loadConfig();
    return config.botEmbedColor;
  }

  private async loadConfig(): Promise<IAppConfiguration> {
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
