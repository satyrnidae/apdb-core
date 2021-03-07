import { LogLevel, OneOrMany } from "@satyrnidae/apdb-utils";
import { ColorResolvable, EmojiResolvable } from "discord.js";

/**
 * Application configuration type
 */
export interface IAppConfiguration {
  /**
   * The bot user token with which to connect to Discord.
   */
  token: string;

  /**
   * The default command prefix for all guilds.
   */
  defaultPrefix: string;

  /**
   * The nickname that the bot will set on the initial server join.
   */
  defaultNickname: string;

  /**
   * Whether or not the welcome message should be sent when the bot joins a new guild.
   */
  showWelcomeMessage: boolean;

  /**
   * The level at which the logger should print information.
   */
  logLevel: keyof typeof LogLevel;

  /**
   * Whether or not the bot should be launched in developer mode, enabling more verbose logging.
   */
  developerMode: boolean;

  /**
   * The default color of the bot's embeds.
   */
   embedColor: ColorResolvable;

  /**
   * A list of all the default randomized emoji that this bot instance should use.
   */
  hearts: OneOrMany<EmojiResolvable>;

  /**
   * A list of directories which can contain plugins for the bot.
   */
  moduleDirectories: OneOrMany<string>;

  /**
   * Messages which will be displayed while the program spins up
   */
   startupMessages: OneOrMany<string>;
}
