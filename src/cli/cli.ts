import { Container, IClientService, ILoggingService, IMessageService, IModuleService, lazyInject, Logger, Module, ServiceIdentifiers } from '@satyrnidae/apdb-api';
import * as srvLine from 'serverline';
import { ICliCommand } from './cli-command';
import yparser, { Options, Arguments } from 'yargs-parser';
import { LogLevel, toMany, toOne } from '@satyrnidae/apdb-utils';
import { Channel, Client, Guild, TextChannel } from 'discord.js';

require('./format');

/**
 * Command line interface module for interacting with the bot while it's running.
 * This is ugly as sin but as a hacked-together afterthought it gets the job done.
 */
export class Cli {
  /**
   * The CLI logger.
   */
  private readonly log: Logger;
  /**
   * The discord.js client instance.
   */
  private readonly client: Client;
  /**
   * A list of all commands registered with the CLI.
   */
  private readonly commands: ICliCommand[] = [];
  /**
   * Whether or not the CLI has been initialized.
   */
  private initialized: boolean = false;
  /**
   * The logging service instance.
   */
  @lazyInject(ServiceIdentifiers.Logging)
  private readonly loggingService!: ILoggingService;
  /**
   * The message service instance.
   */
  @lazyInject(ServiceIdentifiers.Message)
  private readonly messageService!: IMessageService;
  /**
   * The module service instance.
   */
  @lazyInject(ServiceIdentifiers.Module)
  private readonly moduleService!: IModuleService;

  /**
   * Creates a new command line interpreter session.
   */
  constructor() {
    this.client = Container.get<IClientService>(ServiceIdentifiers.Client).getClient();
    this.log = this.loggingService.getLogger('cli');
  }

  /**
   * Initializes the CLI. This should only be called once.
   */
  public async init(): Promise<void> {
    // Return if we are already initialized.
    if (this.initialized) {
      this.log.error('CLI is already initialized!');
      return;
    }

    this.log.info('Starting CLI subsystem...')

    // User input init
    srvLine.init();
    srvLine.setCompletion(['exit', 'quit', 'stop']);
    srvLine.setPrompt('> ');

    srvLine.on('line', async (input: string) => {
      if(!input) {
        return;
      }
      if(!(await this.handleCommand(input))) {
        this.log.error(`Unknown command: ${input.toLowerCase()}`);
      }
    });

    this.commands.push(
      /*
       * Command which exits the program when it is called
       */
      <ICliCommand>{
        aliases: ['quit', 'q', 'exit', 'stop'],
        options: <Options>{
          alias: {
            force: ['-f']
          },
          boolean: ['force']
        },
        syntax: [
          'quit'.b().concat(' [-f|--force]'.dim()).r(),
          'q'.b().concat(' [-f|--force]'.dim()).r(),
          'exit'.b().concat(' [-f|--force]'.dim()).r(),
          'stop'.b().concat(' [-f|--force]'.dim()).r()
        ],
        description: [
          'Shuts down the bot and exits the program.',
          ' - '.concat('force: Optional. Forces the program to shut down without confirmation.'.dim().r())
        ],
        /**
         * Handles the quit command.
         */
        handle: async (args: Arguments): Promise<void> => {
          if (!args['force']) {
            let quit: boolean = false;
            await new Promise<void>(resolve => srvLine.question('Are you sure you wish to exit? '.concat('[y/N]'.dim().r(),': '), (answer: string) => {
              quit = answer.match(/^y(es)?$/i) ? true : false;
              process.stdout.write('> '.return());
              resolve();
            }));
            if (!quit) {
              return;
            }
          }
          process.exit();
        }
      },
      /*
       * Command which provides syntax help for other commands
       */
      <ICliCommand>{
        aliases: ['help', '?'],
        options: <Options>{
          alias: {
            command: ['-c']
          },
          string: ['command']
        },
        syntax: [
          'help'.b().concat(' [[-c|--command] '.concat('command'.i().r(),']').dim()).r(),
          'h'.b().concat(' [[-c|--command] '.concat('command'.i().r(),']').dim()).r()
        ],
        description: [
          'Gets information about the commands available in the command line environment.',
          ' - '.concat('command: The command you wish to learn about.'.dim()).r()
        ],
        /**
         * Handles the help command.
         * @param args The command arguments.
         */
        handle: async (args: Arguments): Promise<void> => {
          const commandName: string = args['command'] || (args._.length ? args._[0] : '');
          const output: string[] = [];

          if (commandName) {
            const command: ICliCommand = this.commands.find(value => toMany(value.aliases).find(name => name.toLowerCase() === commandName.toLowerCase()));
            if (command) {
              output.push('Command aliases: '.b().concat(toMany(command.aliases).join('|'.dim().r()).b()).r());
              output.push('Description:'.b().r());
              toMany(command.description).forEach(line => output.push(`  ${line}`));
              output.push('Syntax:'.b().r());
              toMany(command.syntax).forEach(line => output.push(`   - ${line}`));
              output.push('');

              this.writeMore(...output);
              return;
            }
            this.log.error(`Unknown command: ${commandName}`);
          }

          output.push('Available commands:'.b().r());
          this.commands.forEach(command =>
            output.push(' - '.dim().r().concat(
              toMany(command.aliases).join('|'.dim().r()).b()).r().concat(
                toMany(command.description).length ? `: ${toOne(command.description)}` : ''
              )
            )
          );
          await this.writeMore(...output);
        }
      },
      /*
       * Command which outputs the program version
       */
      <ICliCommand>{
        aliases: ['version', 'v'],
        options: <Options>{},
        description: 'Outputs the program version.',
        syntax: [
          'version'.b().r(),
          'v'.b().r()
        ],
        /**
         * Handles the version command.
         */
        handle: async (): Promise<void> => {
          console.log(`Version ${(global as any).version}`);
          console.log(`API Version ${(global as any).apiVersion}`);
        }
      },
      /**
       * Command which returns authorial information, connected clients, and loaded modules.
       */
      <ICliCommand>{
        aliases: ['about', 'a'],
        options: {},
        description: 'Returns authorial information, connected clients, and loaded modules.',
        syntax: [
          'about'.b().r(),
          'a'.b().r()
        ],
        /**
         * Handles the about command.
         */
        handle: async(): Promise<void> => {
          const output: string[] = [];

          output.push('Another Pluggable Discord Bot'.b().r());
          output.push(`Version ${(global as any).version} `.concat(
            `(API: ${(global as any).apiVersion})`.i().r()
          ));
          output.push('Copyright © 2019-2021 Isabel Maskrey. Some rights reserved.'.dim().r());
          output.push('');
          if (this.client.user) {
            output.push('Currently logged in as '.concat(
              this.client.user.tag.b().r(),
              '.'
            ));
            output.push(`Bot is active in at least ${this.client.guilds.cache.array().length.toString().bold().r()} guild(s).*`);
            output.push(' * Guild count may vary due to caching.'.dim().r());
            output.push('');
          }
          output.push('Loaded modules:'.u().r());
          output.push('');

          const modules: Module[] = toMany(await this.moduleService.getAllModules());
          modules.forEach(module => {
            output.push('  '.concat((module.moduleInfo.name||module.moduleInfo.id).b()).r());
            output.push(`  by ${((toMany(module.moduleInfo.details.authors).join(',')) || 'Unknown').b()}`.r());
            output.push(`  Version ${module.moduleInfo.version} `.concat(`(API: ${module.moduleInfo.details.apiVersion})`.i()).r());
            if (module.moduleInfo.details.website) {
              output.push('    Website: '.b().r().concat(module.moduleInfo.details.website.brightBlue().u()).r());
            }
            if (module.moduleInfo.details.description) {
              output.push('    Description: '.b().r().concat(module.moduleInfo.details.description));
            }
            if (module.moduleInfo.details.path) {
              let text: string = `    Module loaded from ${module.moduleInfo.details.path}`;

              if (module.moduleInfo.details.entryPoint) {
                text = `${text}/${module.moduleInfo.details.entryPoint}`;
              }
              output.push(`${text.dim()}`.r());
            }
            output.push('');
          });

          await this.writeMore(...output);
        }
      },
      /**
       * Evaluates javascript code from the command line.
       */
      <ICliCommand>{
        aliases: 'eval',
        options: {},
        description: 'Evaluates a line of javascript code.',
        syntax: 'eval'.bold().reset().concat(' "code"'),
        /**
         * Handles the eval command.
         * @param args The command arguments.
         */
        handle: async(args: Arguments): Promise<void> => {
          try {
            const result: any = eval(args._.join(' '));
            if (result !== undefined) {
              console.log(`Snippet evaluated successfully. Result: ${result}`.dim().r());
            } else {
              console.log('Snippet evaluated successfully.'.dim().r());
            }
          } catch (err) {
            this.log.error(err);
          }
        }
      },
      /**
       * Sends a message to a guild.
       */
      <ICliCommand>{
        aliases: 'send',
        options: <Options>{
          alias: {
            guild: ['-g'],
            channel: ['-c'],
            message: ['-m'],
            force: ['-f']
          },
          string: ['guild','channel','message'],
          boolean: ['force']
        },
        description: [
          'Sends a message to a specific guild and channel. The message will be marked as sent from the console.',
          ' - '.concat('guild: The ID of the guild to send the message to.'.dim()).r(),
          ' - '.concat('channel: The ID of the channel to send the message in.'.dim()).r(),
          ' - '.concat('message: The message you wish to send.'.dim()).r(),
          ' - '.concat('force: If specified, confirmation messages will be skipped. USE WITH CAUTION.'.dim()).r()
        ],
        syntax: 'send'.b().r().concat('{-g|--guild} guild {-c|--channel} ','channel '.i().r(),'[-m|--message] '.dim().r(),'message '.i().r(),'[-f|--force]'.dim().r()),
        /**
         * Handles the send command.
         * @param args The command arguments.
         */
        handle: async (args: Arguments): Promise<void> => {
          const guildId: string = args['guild'];
          const channelId: string = args['channel']
          const message: string = args['message'] || args._.join(' ');
          const force: boolean = args['force'];
          if (!message) {
            this.log.error('Cannot send an empty message!');
          }
          const guild: Guild = await this.client.guilds.fetch(guildId, true);
          if (!guild) {
            this.log.error('Cannot send message: The specified guild was not found!');
          }
          const channel: Channel = guild.channels.cache.find(ch => ch.id === channelId);
          if (!channel || !(channel instanceof TextChannel)) {
            this.log.error('Cannot send message: The specified channel was not found, or was not a text channel!')
          }
          const textChannel: TextChannel = channel as TextChannel;
          if (!force) {
            let cancel: boolean = false;
            await new Promise<void>(
              resolve => srvLine.question(`Send your message to ${guild.name} in channel #${textChannel.name}? `.concat('[y/N]'.dim().r(),': '),
              (answer: string) => {
                cancel = answer.match(/^y(es)?$/i) ? false : true;
                process.stdout.write('> '.return());
                resolve();
              })
            );
            if (cancel) {
              return;
            }
          }
          // TODO: Translate this message based on guild language preferences
          await this.messageService.send(textChannel, `*Note: this message was sent via the bot's command line.*\n${message}`);
          this.log.info('Message sent!');
        }
      },
      /**
       * Clears the CLI screen.
       */
      <ICliCommand>{
        aliases: ['clear', 'cls'],
        options: {},
        description: 'Clears the log from the console.',
        syntax: [
          'clear'.b().r(),
          'cls'.b().r()
        ],
        /**
         * Handles the clear command.
         */
        handle: async (): Promise<void> => {
          process.stdout.write('Another Pluggable Discord Bot'.b().concat('\n').r().clear());
          process.stdout.write(`Version ${(global as any).version} `.concat(`(API: ${(global as any).apiVersion})`.r(),'\n').r());
          process.stdout.write('Copyright © 2019-2021 Isabel Maskrey. Some rights reserved.'.dim().concat('\n\n').r());
          process.stdout.write('>'.return());
        }
      },
      /**
       * Sets the verbosity of a given loger.
       */
      <ICliCommand>{
        aliases: ['verbosity','logconf','logger','loglevel','log'],
        options: <Options>{
          alias: {
            logger: ['-l','--log'],
            level: ['-v']
          },
          string: ['logger', 'level']
        },
        description: [
          'Sets the logging level of a given logger.',
          ' - '.concat('logger: The name of the logger to alter.'.dim()).r(),
          ' - '.concat('level: The logging level to set. Choose from "trace", "debug", "info", "warn", and "error".'.dim()).r()
        ],
        syntax: [
          'verbosity'.b().r().concat(' [-l|--log|--logger]'.dim().r(),' logger '.i().r(),'[-v|--level]'.dim().r(),' {trace|debug|info|warn|error}'.i().r()),
          'logconf'.b().r().concat(' [-l|--log|--logger]'.dim().r(),' logger '.i().r(),'[-v|--level]'.dim().r(),' {trace|debug|info|warn|error}'.i().r()),
          'logger'.b().r().concat(' [-l|--log|--logger]'.dim().r(),' logger '.i().r(),'[-v|--level]'.dim().r(),' {trace|debug|info|warn|error}'.i().r()),
          'loglevel'.b().r().concat(' [-l|--log|--logger]'.dim().r(),' logger '.i().r(),'[-v|--level]'.dim().r(),' {trace|debug|info|warn|error}'.i().r()),
          'log'.b().r().concat(' [-l|--log|--logger]'.dim().r(),' logger '.i().r(),'[-v|--level]'.dim().r(),' {trace|debug|info|warn|error}'.i().r())
        ],
        /**
         * Handles the verbosity command.
         * @param args The command arguments.
         */
        handle: async (args: Arguments): Promise<void> => {
          let logger: string = args.logger || args._[0];
          const level: string = args.level || (args.logger ? args._[0] : args._[1]);

          if (!logger) {
            this.log.error('You must specify a logger name!');
            return;
          }
          logger = logger.toLowerCase();

          if (!(level && Object.values(LogLevel).includes(level.toLowerCase()))) {
            this.log.error('You must specify a valid log level!');
            return;
          }
          const logLevel: keyof typeof LogLevel = <keyof typeof LogLevel>level.toLowerCase();

          this.loggingService.getLogger(logger).setLogLevel(logLevel);
          this.log.info(`Successfully updated log level for logger ${logger} to ${logLevel}.`);
        }
      }
    );
    this.commands.sort((left, right) => toMany(left.aliases)[0] > toMany(right.aliases)[0] ? 1 : -1);
    this.log.info('CLI subsystem loaded.');
  }

  /**
   * Writes paginated output to the console.
   * @param content The data to write to the log.
   */
  private async writeMore(...content: string[]): Promise<void> {
    const rows: number = process.stdout.getWindowSize()[1];
    const outputRows: number = Math.max(rows - 1, 2);

    while(content.length > 0) {
      const output: string[] = content.splice(0, Math.min(content.length, outputRows));
      output.forEach(line => console.log(line));
      if (content.length > 0) {
        let quit: boolean = false;
        await new Promise<void>(resolve => srvLine.question('(enter to read more, q to cancel...) '.dim().r(), (answer: string) => {
          quit = answer.match(/^q(uit)?$/i) ? true : false;
          process.stdout.write('> '.return());
          resolve();
        }));
        if (quit) {
          break;
        }
      }
    }
  }

  /**
   * Handles user command line input.
   * @param commandLine The user input from the command line
   * @returns true or false depending on whether a matching command was found.
   */
  private async handleCommand(commandLine: string): Promise<boolean> {
    // Chop out the command.
    const commandName: string = commandLine.split(/\s+/)[0];
    // Chop out the arguments and remove any blank values.
    const commandArgs: string[] = commandLine.match(/\\?.|^$/g).reduce((p:any, c:any) => {
      if (c === '"') {
        p.quote ^= 1;
      } else if (!p.quote && c === ' ') {
        p.a.push('');
      } else {
        p.a[p.a.length-1] += c.replace(/\\(.)/,"$1");
      }
      return p;
    }, { a: [''] }).a.slice(1); //split(/\s+/).slice(1).filter(value => value.match(/\S+/));
    // Find a command which matches the input command name.
    const cliCommand: ICliCommand = this.commands.find(entry => toMany(entry.aliases).find(name => name.toLowerCase() === commandName));
    if (!cliCommand) {
      return false;
    }
    // Parse args
    const argv: Arguments = yparser(commandArgs, cliCommand.options);
    await cliCommand.handle(argv);
    return true;
  }
}
