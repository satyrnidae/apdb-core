import { Container, IConfigurationService, ILoggingService, IModuleService, Logger, Module, ServiceIdentifiers } from '@satyrnidae/apdb-api';
import { IAppConfiguration } from '../core/services/configuration/app-configuration';
import * as srvLine from 'serverline';
import { ICliCommand } from './cli-command';
import yparser, { Options, Arguments } from 'yargs-parser';
import { toMany } from '@satyrnidae/apdb-utils';

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
   * A list of all commands registered with the CLI.
   */
  private readonly commands: ICliCommand[] = [];
  /**
   * Whether or not the CLI has been initialized.
   */
  private initialized: boolean = false;

  constructor(private readonly configurationService: IConfigurationService<IAppConfiguration>,
              private readonly loggingService: ILoggingService) {
    this.log = this.loggingService.getLogger('cli');
  }

  /**
   * Initializes the CLI. This should only be called once.
   */
  public async initialize(): Promise<void> {
    // Return if we are already initialized.
    if (this.initialized) {
      this.log.error('CLI is already initialized!');
      return;
    }

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
        command: ['quit', 'q'],
        commandOptions: <Options>{
          alias: {
            force: ['-f']
          },
          boolean: ['force']
        },
        syntax: ['quit [-f|--force]','q [-f|--force]'],
        description: 'Shuts down the bot and exits the program.',
        /**
         * Handles the quit command.
         */
        handle: async (args: Arguments): Promise<void> => {
          if (!args['force']) {
            let quit: boolean = false;
            await new Promise<void>(resolve => srvLine.question('Really quit? [y/N]: ', (answer: string) => {
              quit = answer.match(/^y(es)?$/i) ? true : false;
              process.stdout.write('\x1B[1K> ');
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
        command: ['help', '?'],
        commandOptions: <Options>{
          alias: {
            command: ['-c']
          },
          string: ['command']
        },
        syntax: [
          'help [[-c|--command] command]',
          '? [[-c|--command] command]'
        ],
        description: 'Gets information about the commands available in the command line environment.',
        /**
         * Handles the help command.
         * @param args The command arguments.
         */
        handle: async (args: Arguments): Promise<void> => {
          const commandName: string = args['command'] || (args._.length ? args._[0] : '');
          const output: string[] = [];

          if (commandName) {
            const command: ICliCommand = this.commands.find(value => toMany(value.command).find(name => name.toLowerCase() === commandName.toLowerCase()));
            if (command) {
              output.push(`\x1b[1mCommand aliases:\x1b[0m ${toMany(command.command).join(' \x1b[2m/\x1b[0m ')}`);
              output.push('\x1b[1mDescription:\x1b[0m');
              toMany(command.description).forEach(line => output.push(`\x1b[2m  ${line}\x1b[0m`));
              output.push('\x1b[1mSyntax:\x1b[0m');
              toMany(command.syntax).forEach(line => output.push(`  ${line}`));

              this.writeMore(...output);
              return;
            }
            this.log.error(`Unknown command: ${commandName}`);
          }

          output.push('\x1b[1mAvailable commands:\x1b[0m');
          this.commands.forEach(command => output.push(` \x1b[2m-\x1b[0m ${toMany(command.command).join(' \x1b[2m/\x1b[0m ')}`));
          await this.writeMore(...output);
        }
      },
      /*
       * Command which outputs the program version
       */
      <ICliCommand>{
        command: ['version', 'v'],
        commandOptions: <Options>{},
        description: 'Outputs the program version.',
        syntax: ['version', 'v'],
        /**
         * Handles the version command.
         */
        handle: async (): Promise<void> => {
          console.log(`Version ${(global as any).version}`);
          console.log(`API Version ${(global as any).apiVersion}`);
        }
      },
      <ICliCommand>{
        command: ['about', 'a'],
        commandOptions: <Options>{},
        description: 'Returns authorial information and loaded modules.',
        syntax: ['about', 'a'],
        handle: async(): Promise<void> => {
          const output: string[] = [];

          output.push('\x1b[1mAnother Pluggable Discord Bot\x1b[0m');
          output.push(`Version ${(global as any).version} (API: ${(global as any).apiVersion})`);
          output.push('\x1b[2mCopyright © 2019-2021 Isabel Maskrey. Some rights reserved.\x1b[0m');
          output.push('');
          output.push('Loaded modules:');

          const moduleService: IModuleService = Container.get<IModuleService>(ServiceIdentifiers.Module);

          const modules: Module[] = toMany(await moduleService.getAllModules());
          modules.forEach(module => {
            output.push(`\x1b[1m${module.moduleInfo.name||module.moduleInfo.id}\x1b[0m`);
            output.push(`  by \x1b[1m${(module.moduleInfo.details.authors.join(', ')) || 'Unknown'}\x1b[0m`);
            output.push(`  v${module.moduleInfo.version} (API: ${module.moduleInfo.details.apiVersion})`);
            output.push(`  Website: ${module.moduleInfo.details.website || 'none specified.'}`);
            output.push(`  Description: ${module.moduleInfo.details.description || 'none available.'}`);
            output.push('');
          });

          await this.writeMore(...output);
        }
      },
      <ICliCommand>{
        command: 'eval',
        commandOptions: {},
        description: 'Evaluates a line of javascript code.',
        syntax: 'eval "code"',
        handle: async(args: Arguments): Promise<void> => {
          try {
            console.log(`Result: ${eval(args._.join(' '))}`);
          } catch (err) {
            this.log.error(err);
          }
        }
      }
    );
  }

  private async writeMore(...content: string[]): Promise<void> {
    const rows: number = process.stdout.getWindowSize()[1];
    const outputRows: number = Math.max(rows - 1, 2);

    while(content.length > 0) {
      const output: string[] = content.splice(0, Math.min(content.length, outputRows));
      output.forEach(line => console.log(line));
      if (content.length > 0) {
        let quit: boolean = false;
        await new Promise<void>(resolve => srvLine.question('(enter to read more, q to cancel...) ', (answer: string) => {
          quit = answer.match(/^q(uit)?$/i) ? true : false;
          process.stdout.write('\x1B[1K> ');
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
    const cliCommand: ICliCommand = this.commands.find(entry => toMany(entry.command).find(name => name.toLowerCase() === commandName));
    if (!cliCommand) {
      return false;
    }
    // Parse args
    const argv: Arguments = yparser(commandArgs, cliCommand.commandOptions);
    await cliCommand.handle(argv);
    return true;
  }
}
