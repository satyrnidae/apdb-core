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

require('./cli/format');

/**
 * Shows a splash image in the console.
 * @param configurationService The configuration service instance.
 */
async function splash(configurationService: IConfigurationService<IAppConfiguration>): Promise<void> {
  process.stdout.write('\x1B[?25l');
  process.stdout.write('╔═══════════════════════════════════════════════════════════════╗'.brightBlue().concat('\n'));
  process.stdout.write('║'.brightBlue().concat('                 ','Another Pluggable Discord Bot'.b().u().r(),'__'.red().dim().r(),'               ','║'.brightBlue(),'\n'));
  process.stdout.write('║'.brightBlue().concat('                                            ','╱   ╲___'.red().dim().r(),'           ','║'.brightBlue(),'\n'));
  process.stdout.write('║'.brightBlue().concat('                                           ','╱   ╱    ╲'.red().dim().r(),'          ','║'.brightBlue(),'\n'));
  process.stdout.write('║'.brightBlue().concat('                                          ','|   ╱     ╱'.red().dim().r(),'          ','║'.brightBlue(),'\n'));
  process.stdout.write('║'.brightBlue().concat('                                      ','╳ ╳'.green().dim().r(),' |  ╱     ╱'.red().dim().r(),'__'.yellow(),'         ','║'.brightBlue(),'\n'));
  process.stdout.write('║'.brightBlue().concat('                                     ','┼ ┼'.green().dim().r(),'  |_╱     ╱'.red().dim().r(),'   ╲____'.yellow(),'    ','║'.brightBlue(),'\n'));
  process.stdout.write('║'.brightBlue().concat('  © 2019-2021 Isabel Maskrey         '.dim().r(),'┼ ┼'.green().dim().r(),' ╱'.yellow(),'|_|____╱'.red().dim().r(),'  ╱  │   ╲   '.yellow(),'║'.brightBlue(),'\n'));
  process.stdout.write('║'.brightBlue().concat('  Some Rights Reserved.               '.dim().r(),'╳'.green().dim().r(),'╭'.yellow(),'╳'.green().dim().r(),'       ___|   ╲    ╲  '.yellow(),'║'.brightBlue(),'\n'));
  process.stdout.write('║'.brightBlue().concat('  See LICENSE for more information.   '.dim().r(),'╱_ ╱_'.gray(),'╭─╮╭╯ ╲__╲___|    ╲ '.yellow(),'║'.brightBlue(),'\n'));
  process.stdout.write('║'.brightBlue().concat('                                       ','╰─╮'.yellow(),'_'.white(),'│ ││     '.yellow(),'╲╲  ╲╲'.gray(),'_  │ '.yellow(),'║'.brightBlue(),'\n'));
  process.stdout.write('║'.brightBlue().concat('                                        ','╱'.gray(),'╰─╯'.white(),'╱╱       ╰╯ || '.gray(),'╲'.yellow(),'_'.white(),'│ '.yellow(),'║'.brightBlue(),'\n'));
  process.stdout.write('║'.brightBlue().concat('                                        ','╰╯  ╰╯          ╰╯  '.gray(),'╲│ '.white(),'║'.brightBlue(),'\n'));
  process.stdout.write('║                                                               ║'.brightBlue().concat('\n'));
  process.stdout.write('╚═══════════════════════════════════════════════════════════════╝'.brightBlue().concat('\n'));
  process.stdout.write('\n');
  process.stdout.write(`Version ${(global as any).version }\n`);
  process.stdout.write(`API Version ${(global as any).apiVersion}\n`);
  process.stdout.write('\n');

  // For reference here's what the ASCII art looks like devoid of formatting:
  //        ___
  //       ╱   ╲___
  //      ╱   ╱    ╲
  //     |   ╱     ╱
  //     |  ╱     ╱__
  // ┼ ┼ |_╱     ╱   ╲ ___
  // ┼ ┼╱|_|____╱  ╱  │   ╲
  // ╳╭╳       ___|   ╲    ╲
  // ╱_ ╱_╭─╮╭╯ ╲__╲___|    ╲
  //  ╰─╮_│ ││      ╲╲ ╲╲_  │
  //   ╱╰─╯╱╱       ╰╯ || ╲_│
  //   ╰╯  ╰╯          ╰╯  ╲│

  const messages: OneOrMany<string> = await configurationService.get('startupMessages');
  const message: string = pickRandom(messages);

  // yea this is only async to await this sleep();
  return new Promise<void>(resolver => {
    const spinner: string[] = ['   ','.  ','.. ','...'];
    let index: number = 0;
    const handle: NodeJS.Timeout = setInterval(() => {
      process.stdout.write('\r');
      process.stdout.write(message);

      ++index;
      let spinnerChar: string = spinner[index];
      if (!spinnerChar) {
        index = 0;
        spinnerChar = spinner[index];
      }
      process.stdout.write(spinnerChar);
    }, 300);
    sleep(3000).then(() => {
      clearInterval(handle);
      process.stdout.write(`\r${' '.repeat(message.length+spinner[0].length)}\r`);
      resolver();
    });
  });
}

/**
 * Executes the bot's lifecycle.
 * @param lifecycle The lifecycle instance to execute
 */
async function executeLifecycle(lifecycle: ILifecycle): Promise<void> {
  await lifecycle.preInitialize();
  await lifecycle.initialize();
  await lifecycle.postInitialize();
  return lifecycle.run();
}

/**
 * Runs the bot.
 */
async function run(): Promise<void> {
  // Read package
  const packageInfo: any = JSON.parse((await fsa.readFileAsync('package.json')).toString());

  // Global settings
  (global as any).version = packageInfo.version;
  (global as any).apiVersion = semver.clean((packageInfo.dependencies['@satyrnidae/apdb-api'] as string).replace('^', ''));
  (global as any).configPath = resolve(`${__dirname}/../config.json`);
  (global as any).packageInfo = packageInfo;

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
  client.on('ready', () =>  {
    log.info('Client ready!');
    new Cli().init();
  });

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
    await executeLifecycle(robot);
  } catch (err) {
    log.error(err);
  }
}

run();
