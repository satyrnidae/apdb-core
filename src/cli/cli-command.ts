import { OneOrMany } from "@satyrnidae/apdb-utils";
import { Options, Arguments } from "yargs-parser";

/**
 * Represents a command-line interface command
 */
export interface ICliCommand {
  /**
   * Input commands which will match this command. One or many. Must be unique,
   * or only the first command in the list with a matched alias will count.
   * Words or hyphenated words allowed. No spaces.
   */
  command: OneOrMany<string>;
  /**
   * Yargs parser options for this command.
   */
  commandOptions: Options;
  /**
   * The command syntax. Must follow command-line documentation standards.
   */
  syntax: OneOrMany<string>;
  /**
   * A short description of the command. Can be one or many lines.
   */
  description: OneOrMany<string>;
  /**
   * Asynchronous command handler.
   * @param args yargs which are passed to the command, optional.
   */
  handle(args: Arguments): Promise<void>;
}
