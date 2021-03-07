import { resolve } from "path";
import * as semver from 'semver';
import { Container, ILoggingService, IModuleService, ServiceIdentifiers, IConfigurationService, IClientService, IEventService, Logger, ILifecycle, IDataService, ICommandService, IMessageService } from "@satyrnidae/apdb-api";
import { sleep, fsa, pickRandom, OneOrMany } from '@satyrnidae/apdb-utils';
import { ConfigurationService } from "./core/services/configuration-service";
import { LoggingService } from "./core/services/logging-service";
import { ModuleService } from "./core/services/module-service";
import { Robot } from "./core/robot";
import { ClientService } from "./core/services/client-service";
import { EventService } from "./core/services/event-service";
import { Client } from "discord.js";
import { DataService } from "./core/services/data-service";
import { GuildConfiguration } from "./db/entity/guild-configuration";
import { GuildConfigurationFactory } from "./db/factory/guild-configuration-factory";
import { CommandService } from "./core/services/command-service";
import { MessageService } from "./core/services/message-service";
import { IAppConfiguration } from "./core/services/configuration/app-configuration";
import { Cli } from "./cli/cli";

async function splash(configurationService: IConfigurationService<IAppConfiguration>): Promise<void> {
  process.stdout.write('\x1Bc');
  process.stdout.write('\x1B[?25l');
  process.stdout.write('╔═════════════════════════════════════════════╗\n');
  process.stdout.write('║        Another Pluggable Discord Bot        ║\n');
  process.stdout.write('║        ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔        ║\n');
  process.stdout.write('║                            │╲▁╱╲            ║\n');
  process.stdout.write('║                          ╷─┘    ╲      ▁▁▁  ║\n');
  process.stdout.write('║                           ╲▁   ▁╱     ╱╲ │  ║\n');
  process.stdout.write('║  (c) 2021 Isabel Maskrey    ╱   ╲▁▁▁ ╱  ╲│  ║\n');
  process.stdout.write('║  Some rights reserved.     ╱        ╲   ╱   ║\n');
  process.stdout.write('║                            │ │ │ ╱     ╱    ║\n');
  process.stdout.write('║                            │ │ │ ╲  ╱▁╱     ║\n');
  process.stdout.write('║                            ╱▁╱▁╱▁╱▁▁╱       ║\n');
  process.stdout.write('╚═════════════════════════════════════════════╝\n');
  process.stdout.write('\n');
  process.stdout.write(`Version ${(global as any).version }\n`);
  process.stdout.write(`API Version ${(global as any).apiVersion}\n`);
  process.stdout.write('\n');

  const messages: OneOrMany<string> = await configurationService.get('startupMessages');
  const message: string = pickRandom(messages);

  // yea this is only async to await this sleep();
  return new Promise<void>(resolver => {
    const spinner: string[] = ['-', '\\', '|', '/'];
    let index: number = 0;
    const handle: NodeJS.Timeout = setInterval(() => {
      process.stdout.write('\r');
      process.stdout.write(message);
      process.stdout.write(' ');

      ++index;
      let spinnerChar: string = spinner[index];
      if (!spinnerChar) {
        index = 0;
        spinnerChar = spinner[index];
      }
      process.stdout.write(spinnerChar);
    }, 100);
    sleep(3000).then(() => {
      clearInterval(handle);
      process.stdout.write(`\r${new Array(message.length+3).join(' ')}\r`);
      resolver();
    });
  });
}

async function initializeInput(configurationService: IConfigurationService<IAppConfiguration>, loggingService: ILoggingService): Promise<void> {
  return new Cli(configurationService, loggingService).initialize();
}

async function executeLifecycle(lifecycle: ILifecycle): Promise<void> {
  await lifecycle.preInitialize();
  await lifecycle.initialize();
  await lifecycle.postInitialize();
  return lifecycle.run();
}

async function run(): Promise<void> {
  // Read package
  const packageInfo: any = JSON.parse((await fsa.readFileAsync('package.json')).toString());

  // Global settings
  (global as any).version = packageInfo.version;
  (global as any).apiVersion = semver.clean((packageInfo.dependencies['@satyrnidae/apdb-api'] as string).replace('^', ''));
  (global as any).configPath = resolve(`${__dirname}/../config.json`);

  // Core service bindings
  Container.bind<IConfigurationService<IAppConfiguration>>(ServiceIdentifiers.Configuration).to(ConfigurationService).inSingletonScope();
  Container.bind<IClientService>(ServiceIdentifiers.Client).to(ClientService).inSingletonScope();
  Container.bind<IEventService>(ServiceIdentifiers.Event).to(EventService).inSingletonScope();
  Container.bind<ILoggingService>(ServiceIdentifiers.Logging).to(LoggingService).inSingletonScope();
  Container.bind<ICommandService>(ServiceIdentifiers.Command).to(CommandService).inSingletonScope();
  Container.bind<IModuleService>(ServiceIdentifiers.Module).to(ModuleService).inSingletonScope();
  Container.bind<IDataService>(ServiceIdentifiers.Data).to(DataService).inSingletonScope();
  Container.bind<IMessageService>(ServiceIdentifiers.Message).to(MessageService).inSingletonScope();

  // Load configuration
  const configurationService: IConfigurationService<IAppConfiguration> = Container.get<IConfigurationService<IAppConfiguration>>(ServiceIdentifiers.Configuration);

  await splash(configurationService);

  // Set up logger
  const loggingService: ILoggingService = Container.get<ILoggingService>(ServiceIdentifiers.Logging);
  const log: Logger = loggingService.getLogger('core');

  // Register data service factories
  const dataService: IDataService = Container.get<IDataService>(ServiceIdentifiers.Data);
  await dataService.registerFactory(GuildConfiguration, GuildConfigurationFactory);

  // Set up client instance for initialization
  const client: Client = Container.get<IClientService>(ServiceIdentifiers.Client).getClient();
  client.on('disconnect', () => log.info('Client disconnected.'));
  client.on('ready', () => log.info('Client ready!'));

  // Set up process input handlers
  process.on('SIGINT', function () {
    log.trace("Caught interrupt signal!");
    process.exit();
  });
  process.on('exit', () => {
    client.destroy();
    log.info('Exiting...');
  });
  process.on('uncaughtException', (error: Error) => {
    log.error(error);
    process.exit();
  });

  try {
    // Start the robot
    const robot: Robot = Container.resolve(Robot);
    await executeLifecycle(robot).then(async () => await initializeInput(configurationService, loggingService));
  } catch (err) {
    log.error(err);
  }
}

run();
