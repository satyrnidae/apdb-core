import { resolve } from "path";
import * as semver from 'semver';
import { Container, ILoggingService, IModuleService, ServiceIdentifiers, IConfigurationService, IClientService, IEventService, Logger, ILifecycle, IDataService, ICommandService } from "@satyrnidae/apdb-api";
import { sleep, fsa } from '@satyrnidae/apdb-utils';
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

async function splash(log: Logger): Promise<void> {
  log.info('╔═════════════════════════════════════════════╗');
  log.info('║        Another Pluggable Discord Bot        ║');
  log.info('║        ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔        ║');
  log.info('║                            │╲▁╱╲            ║');
  log.info('║                          ╷─┘    ╲      ▁▁▁  ║');
  log.info('║                           ╲▁   ▁╱     ╱╲ │  ║');
  log.info('║  (c) 2020 Isabel Maskrey    ╱   ╲▁▁▁ ╱  ╲│  ║');
  log.info('║  All rights reserved       ╱        ╲   ╱   ║');
  log.info('║                            │ │ │ ╱     ╱    ║');
  log.info('║                            │ │ │ ╲  ╱▁╱     ║');
  log.info('║                            ╱▁╱▁╱▁╱▁▁╱       ║');
  log.info('╚═════════════════════════════════════════════╝');
  log.info();
  log.info(`Version ${(global as any).version }`);
  log.info(`API Version ${(global as any).apiVersion}`);
  log.info();

  return sleep(3000);
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
  Container.bind<IConfigurationService>(ServiceIdentifiers.Configuration).to(ConfigurationService).inSingletonScope();
  Container.bind<IClientService>(ServiceIdentifiers.Client).to(ClientService).inSingletonScope();
  Container.bind<IEventService>(ServiceIdentifiers.Event).to(EventService).inSingletonScope();
  Container.bind<ILoggingService>(ServiceIdentifiers.Logging).to(LoggingService).inSingletonScope();
  Container.bind<ICommandService>(ServiceIdentifiers.Command).to(CommandService).inSingletonScope();
  Container.bind<IModuleService>(ServiceIdentifiers.Module).to(ModuleService).inSingletonScope();
  Container.bind<IDataService>(ServiceIdentifiers.Data).to(DataService).inSingletonScope();

  // Set up values for initialization
  const log: Logger = Container.get<ILoggingService>(ServiceIdentifiers.Logging).getLogger('core');
  const client: Client = Container.get<IClientService>(ServiceIdentifiers.Client).getClient();
  const robot: Robot = Container.resolve(Robot);
  const dataService: DataService = Container.get<IDataService>(ServiceIdentifiers.Data) as DataService;

  await dataService.registerFactory(GuildConfiguration, GuildConfigurationFactory);

  log.setLogLevel('trace');

  client.on('disconnect', () => log.info('Client disconnected.'));
  client.on('ready', () => log.info('Client ready!'));

  process.on('SIGINT', function () {
    log.trace("Caught interrupt signal!");
    process.exit();
  });
  process.on("exit", () => {
    client.destroy();
    log.info('Exiting...');
  });

  await splash(log);
  try {
    await executeLifecycle(robot);
  } catch (err) {
    log.error(err);
  }
}

run();
