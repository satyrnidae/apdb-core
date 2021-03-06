import { resolve } from "path";
import * as semver from 'semver';
import * as srvLine from 'serverline';
import { Container, ILoggingService, IModuleService, ServiceIdentifiers, IConfigurationService, IClientService, IEventService, Logger, ILifecycle, IDataService, ICommandService, IMessageService } from "@satyrnidae/apdb-api";
import { sleep, fsa, pickRandom } from '@satyrnidae/apdb-utils';
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

async function splash(): Promise<void> {
  process.stdout.write('\x1Bc');
  process.stdout.write('╔═════════════════════════════════════════════╗\n');
  process.stdout.write('║        Another Pluggable Discord Bot        ║\n');
  process.stdout.write('║        ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔        ║\n');
  process.stdout.write('║                            │╲▁╱╲            ║\n');
  process.stdout.write('║                          ╷─┘    ╲      ▁▁▁  ║\n');
  process.stdout.write('║                           ╲▁   ▁╱     ╱╲ │  ║\n');
  process.stdout.write('║  (c) 2020 Isabel Maskrey    ╱   ╲▁▁▁ ╱  ╲│  ║\n');
  process.stdout.write('║  All rights reserved       ╱        ╲   ╱   ║\n');
  process.stdout.write('║                            │ │ │ ╱     ╱    ║\n');
  process.stdout.write('║                            │ │ │ ╲  ╱▁╱     ║\n');
  process.stdout.write('║                            ╱▁╱▁╱▁╱▁▁╱       ║\n');
  process.stdout.write('╚═════════════════════════════════════════════╝\n');
  process.stdout.write('\n');
  process.stdout.write(`Version ${(global as any).version }\n`);
  process.stdout.write(`API Version ${(global as any).apiVersion}\n`);
  process.stdout.write('\n');

  const messageFile: string = `${__dirname}/../messages.txt`;
  if(await fsa.existsAsync(messageFile)) {
    const fileContents: Buffer = await fsa.readFileAsync(messageFile);
    const messages: string[] = fileContents.toString().split(/\r\n/).filter(line => line);
    const message: string = pickRandom(messages);
    process.stdout.write(`${message}...\n`);
    process.stdout.write('\n');
  }

  // yea this is only async to await this sleep();
  await sleep(3000);
}

function initializeInput(log: Logger): void {
  // User input init
  srvLine.init();
  srvLine.setCompletion(['exit', 'quit', 'stop']);
  srvLine.setPrompt('> ');

  srvLine.on('line', (input: string) => {
    switch (input.toLowerCase()) {
      case '':
        break;
      case 'exit':
      case 'stop':
      case 'quit':
        process.exit();
      default:
        log.error(`Unknown command: "${input}"`);
        break;
    }

    if (srvLine.isMuted()) {
      srvLine.setMuted(false);
    }
  });
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

  await splash();

  // Core service bindings
  Container.bind<IConfigurationService>(ServiceIdentifiers.Configuration).to(ConfigurationService).inSingletonScope();
  Container.bind<IClientService>(ServiceIdentifiers.Client).to(ClientService).inSingletonScope();
  Container.bind<IEventService>(ServiceIdentifiers.Event).to(EventService).inSingletonScope();
  Container.bind<ILoggingService>(ServiceIdentifiers.Logging).to(LoggingService).inSingletonScope();
  Container.bind<ICommandService>(ServiceIdentifiers.Command).to(CommandService).inSingletonScope();
  Container.bind<IModuleService>(ServiceIdentifiers.Module).to(ModuleService).inSingletonScope();
  Container.bind<IDataService>(ServiceIdentifiers.Data).to(DataService).inSingletonScope();
  Container.bind<IMessageService>(ServiceIdentifiers.Message).to(MessageService).inSingletonScope();

  // Load configuration
  const configurationService: IConfigurationService = Container.get<IConfigurationService>(ServiceIdentifiers.Configuration);

  // Set up logger
  const log: Logger = Container.get<ILoggingService>(ServiceIdentifiers.Logging).getLogger('core');
  log.setLogLevel(await configurationService.get('logLevel'));

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
    await executeLifecycle(robot).then(() => initializeInput(log));
  } catch (err) {
    log.error(err);
  }
}

run();
