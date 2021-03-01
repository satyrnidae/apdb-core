import { Command, lazyInject, ServiceIdentifiers, ICommandService, IModuleService, Module, IClientService, IConfigurationService, ILoggingService, Logger } from "@satyrnidae/apdb-api";
import { Options, Arguments } from 'yargs-parser';
import { Message, MessageEmbed, NewsChannel, User } from "discord.js";
import { toMany, forEachAsync } from "@satyrnidae/apdb-utils";
import { Embeds } from 'discord-paginationembed';

const MAX_FIELDS: number = 3;

/**
 * Command handler which provides information on plugins and usage information
 * for commands.
 */
export class HelpCommand extends Command {
  public friendlyName: string = 'Help';

  public command: string = 'help';

  public syntax: string[] = [
    'help [[-p|--page] *page*]',
    'help {-a|--all} [[-p|--page] *page*]',
    'help {-l|--plugin} *plugin* [[-p|--page] *page*]',
    'help [-c|--command] *command* [[-l|--plugin] *plugin*] [[-p|--page] *page*]'
  ];

  public description: string = 'Provides a detailed overview of any command that the bot can perform.';

  public options: Options = {
    alias: {
      command: ['-c'],
      all: ['-a'],
      plugin: ['-l'],
      page: ['-p']
    },
    string: ['command', 'plugin'],
    boolean: ['all'],
    number: ['page'],
    configuration: {
      'duplicate-arguments-array': false
    }
  };

  @lazyInject(ServiceIdentifiers.Command)
  private readonly commandService: ICommandService;

  @lazyInject(ServiceIdentifiers.Module)
  private readonly moduleService: IModuleService;

  @lazyInject(ServiceIdentifiers.Client)
  private readonly clientService: IClientService;

  @lazyInject(ServiceIdentifiers.Configuration)
  private readonly configurationService: IConfigurationService;

  @lazyInject(ServiceIdentifiers.Logging)
  private readonly loggingService!: ILoggingService;

  /**
   * Checks if the command
   */
  public async checkPermissions(): Promise<boolean> {
    return true;
  }

  /**
   * Executes the help command.
   * @param message The command message.
   * @param args The arguments passed to the command.
   */
  public async run(message: Message, args: Arguments): Promise<void> {
    if (message.channel instanceof NewsChannel) {
      // what how
      return;
    }
    const page: number = args['page'] || 1;

    if (this.allParam(args)) {
      return this.sendAllHelpMessage(message, page);
    }

    return this.sendHelpMessage(message);
  }

  private async sendHelpMessage(message: Message): Promise<void> {
    const name: string = message.guild ? message.guild.me.displayName : this.clientService.getClient().user.username;
    const prefix: string = await this.commandService.getCommandPrefix(message.guild);
    const helpMessage: string = `Hi! I'm ${name}, your modular robot friend!\r\n`
      .concat(`To list all the commands that I can understand, just send the command \`${prefix}help --all\` somewhere i can see it!\r\n`)
      .concat(`You can also check out my core documentation on <https://www.github.com/satyrnidae/apdb-core>.\r\n`)
      .concat(`Thanks! ${await this.configurationService.getRandomHeart()}`);

    await message.reply(helpMessage);
  }

  private async sendAllHelpMessage(message: Message, page: number): Promise<void> {
    if (message.channel instanceof NewsChannel) {
      // what how
      return;
    }

    const modules: Module[] = toMany(this.moduleService.getAllModules());
    const modulesWithCommands: Module[] = modules.filter(module => toMany(this.commandService.getAll(module.moduleInfo.id, message.guild)).length);

    if (!modulesWithCommands.length) {
      await message.reply('There are no commands for me to list!');
    }

    const embeds: MessageEmbed[] = [];
    const prefix: string = await this.commandService.getCommandPrefix(message.guild);

    await forEachAsync(modulesWithCommands, async (module: Module) => {
      const commandsForModule: Command[] = toMany(await this.commandService.getAll(module.moduleInfo.id, message.guild));

      for (let i: number = 0; i < commandsForModule.length / MAX_FIELDS; i++) {
        const embed: MessageEmbed = new MessageEmbed()
          .setTitle(`${module.moduleInfo.name} Plugin`)
          .setDescription('Here are the commands provided by this plugin:')
          .setFooter('');

        for (let j: number = 0; j < MAX_FIELDS && commandsForModule.length > i * MAX_FIELDS + j; j++) {
          const command: Command = commandsForModule[i * MAX_FIELDS + j]
          embed.addField(`"${command.friendlyName}" Command`, `\`${prefix}${command.command}\`: ${command.description}\n\`\`\`${command.syntax.join('\n')}\`\`\``, false);
        }
        embeds.push(embed);
      }
    });

    const log: Logger = this.loggingService.getLogger(this.moduleId);
    const currentPage: number = Math.min(embeds.length, page);
    const paginatedEmbeds = new Embeds()
      .setArray(embeds)
      .setAuthorizedUsers([message.author.id])
      .setChannel(message.channel)
      .setPageIndicator('footer')
      .setColor(await this.configurationService.getBotEmbedColor())
      .setDeleteOnTimeout(true)
      .setPage(currentPage)
      .on('start', () => log.debug('Added a new paginated embed.'))
      .on('finish', (user: User) => {
        log.debug(`User ${user.username} finished a paginated embed.`);
        if (message.deletable) {
          message.delete();
        }
      })
      .on('expire', () => {
        log.debug('A paginated embed expired.');
        if (message.deletable) {
          message.delete();
        }
      })
      .on('error', (error: Error) => log.error(error));

    await paginatedEmbeds.build();
  }

  private allParam(args: Arguments) {
    return args['all'] !== undefined && args['all'] || args._.length && args._[0] === 'all';
  }
}
