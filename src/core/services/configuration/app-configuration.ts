import { LogLevel, OneOrMany } from "@satyrnidae/apdb-utils";
import { OAuth2Scopes } from "discord-api-types";
import { ColorResolvable, EmojiResolvable, PermissionResolvable } from "discord.js";

/**
 * Application configuration type
 */
export interface IAppConfiguration {
  /**
   * The bot user token with which to connect to Discord.
   */
  token: string;

  /**
   * The bot application ID, which is needed for slash commands.
   */
  appId: string;

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

   /**
    * Bot typing emulation.
    */
   typingEmulation: boolean;

   /**
    * Bot's default required permissions. This can vary based on plugins.
    */
   permissions: PermissionResolvable;

   /**
    * Bot's default required scopes. This can vary based on plugins.
    */
   scopes: OneOrMany<OAuth2Scopes>;
}
