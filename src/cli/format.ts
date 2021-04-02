/**
 * CLI color values
 */
enum CliColor {
  black = 0,
  red = 1,
  green = 2,
  yellow = 3,
  blue = 4,
  magenta = 5,
  cyan = 6,
  white = 7
}

/**
 * Add command line formatting to the string prototype
 */
interface String {
  /**
   * Resets the string format.
   */
  reset(): string;
  /**
   * Formats the string to look brighter than usual
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  bold(): string;
  /**
   * Formats the string to be italic
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  italicize(): string;
  /**
   * Formats the string to look darker than usual
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  dim(): string;
  /**
   * Formats the string with an underline
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  underline(): string;
  /**
   * Formats the string to blink between normal and dim
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  blinking(): string;
  /**
   * Formats the string to be in reverse
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  invert(): string;
  /**
   * Formats the string to be hidden
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  hidden(): string;
  /**
   * Formats the string to be hidden
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  strikethrough(): string;
  /**
   * Formats the string to be hidden
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  overline(): string;
  /**
   * Colors the text foreground black.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  black(): string;
  /**
   * Colors the text foreground red.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  red(): string;
  /**
   * Colors the text foreground green.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  green(): string;
  /**
   * Colors the text foreground yellow.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  yellow(): string;
  /**
   * Colors the text foreground blue.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  blue(): string;
  /**
   * Colors the text foreground magenta.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  magenta(): string;
  /**
   * Colors the text foreground cyan.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  cyan(): string;
  /**
   * Colors the text foreground white.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  white(): string;
  /**
   * Colors the text background black.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  blackBg(): string;
  /**
   * Colors the text background red.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  redBg(): string;
  /**
   * Colors the text background green.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  greenBg(): string;
  /**
   * Colors the text background yellow.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  yellowBg(): string;
  /**
   * Colors the text background blue.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  blueBg(): string;
  /**
   * Colors the text background magenta.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  magentaBg(): string;
  /**
   * Colors the text background cyan.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  cyanBg(): string;
  /**
   * Colors the text background white.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  whiteBg(): string;
  /**
   * Colors the text foreground gray.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  gray(): string;
  /**
   * Colors the text foreground grey.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  grey(): string;
  /**
   * Colors the text foreground bright black.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightBlack(): string;
  /**
   * Colors the text foreground bright red.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightRed(): string;
  /**
   * Colors the text foreground bright green.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightGreen(): string;
  /**
   * Colors the text foreground bright yellow.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightYellow(): string;
  /**
   * Colors the text foreground bright blue.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightBlue(): string;
  /**
   * Colors the text foreground bright magenta.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightMagenta(): string;
  /**
   * Colors the text foreground bright cyan.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightCyan(): string;
  /**
   * Colors the text foreground bright white.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightWhite(): string;
  /**
   * Colors the text background gray.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  grayBg(): string;
  /**
   * Colors the text background grey.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  greyBg(): string;
  /**
   * Colors the text background bright black.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightBlackBg(): string;
  /**
   * Colors the text background bright red.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightRedBg(): string;
  /**
   * Colors the text background bright green.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightGreenBg(): string;
  /**
   * Colors the text background bright yellow.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightYellowBg(): string;
  /**
   * Colors the text background bright blue.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightBlueBg(): string;
  /**
   * Colors the text background bright magenta.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightMagentaBg(): string;
  /**
   * Colors the text background bright cyan.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightCyanBg(): string;
  /**
   * Colors the text background bright white.
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
  brightWhiteBg(): string;
  /**
   * Returns the string to the start of the line.
   */
  return(): string;
  /**
   * Clears the CLI output and writes the string.
   */
  clear(): string;
  /**
   * Applies a CLI format.
   * @param format The format in / out codes
   * @param reset Whether or not the format should be reset at the end
   */
  applyCliFormat(inCode: number, outCode: number): string;
  /**
   * Applies a CLI color format
   * @param color The base color code
   * @param background Whether the color is in the foreground or background
   * @param bright Whether the color is bright or not
   * @param reset Whether or not the format should be reset at the end
   */
  applyCliColor(color: keyof typeof CliColor, background: boolean, bright: boolean): string;
  /**
   * Resets the string format.
   */
  r(): string;
  /**
   * Formats the string to look brighter than usual
   * @param reset Whether or not the formatting will be reset at the end of the string.
   */
   b(): string;
   /**
    * Formats the string to be italic
    * @param reset Whether or not the formatting will be reset at the end of the string.
    */
   i(): string;
   /**
    * Formats the string with an underline
    * @param reset Whether or not the formatting will be reset at the end of the string.
    */
   u(): string;
   /**
    * Formats the string to be hidden
    * @param reset Whether or not the formatting will be reset at the end of the string.
    */
   s(): string;
   /**
    * Formats the string to be hidden
    * @param reset Whether or not the formatting will be reset at the end of the string.
    */
   o(): string;
}

String.prototype.reset = function(): string {
  return String(this).applyCliFormat(0, 0);
}
String.prototype.bold = function(): string {
  return String(this).applyCliFormat(1, 22);
}
String.prototype.dim = function(): string {
  return String(this).applyCliFormat(2, 23);
}
String.prototype.italicize = function(): string {
  return String(this).applyCliFormat(3, 22);
}
String.prototype.underline = function(): string {
  return String(this).applyCliFormat(4, 24);
}
String.prototype.blinking = function(): string {
  return String(this).applyCliFormat(5, 25);
}
String.prototype.invert = function(): string {
  return String(this).applyCliFormat(7, 27);
}
String.prototype.hidden = function(): string {
  return String(this).applyCliFormat(8, 28);
}
String.prototype.strikethrough = function(): string {
  return String(this).applyCliFormat(9, 29);
}
String.prototype.overline = function(): string {
  return String(this).applyCliFormat(53, 55);
}
String.prototype.black = function(): string {
  return String(this).applyCliColor('black', false, false);
}
String.prototype.red = function(): string {
  return String(this).applyCliColor('red', false, false);
}
String.prototype.green = function(): string {
  return String(this).applyCliColor('green', false, false);
}
String.prototype.yellow = function(): string {
  return String(this).applyCliColor('yellow', false, false);
}
String.prototype.blue = function(): string {
  return String(this).applyCliColor('blue', false, false);
}
String.prototype.magenta = function(): string {
  return String(this).applyCliColor('magenta', false, false);
}
String.prototype.cyan = function(): string {
  return String(this).applyCliColor('cyan', false, false);
}
String.prototype.white = function(): string {
  return String(this).applyCliColor('white', false, false);
}
String.prototype.blackBg = function(): string {
  return String(this).applyCliColor('black', true, false);
}
String.prototype.redBg = function(): string {
  return String(this).applyCliColor('red', true, false);
}
String.prototype.greenBg = function(): string {
  return String(this).applyCliColor('green', true, false);
}
String.prototype.yellowBg = function(): string {
  return String(this).applyCliColor('yellow', true, false);
}
String.prototype.blueBg = function(): string {
  return String(this).applyCliColor('blue', true, false);
}
String.prototype.magentaBg = function(): string {
  return String(this).applyCliColor('magenta', true, false);
}
String.prototype.cyanBg = function(): string {
  return String(this).applyCliColor('cyan', true, false);
}
String.prototype.whiteBg = function(): string {
  return String(this).applyCliColor('white', true, false);
}
String.prototype.gray = function(): string {
  return String(this).applyCliColor('black', false, true);
};
String.prototype.grey = function(): string {
  return String(this).applyCliColor('black', false, true);
};
String.prototype.brightBlack = function(): string {
  return String(this).applyCliColor('black', false, true);
};
String.prototype.brightRed = function(): string {
  return String(this).applyCliColor('red', false, true);
};
String.prototype.brightGreen = function(): string {
  return String(this).applyCliColor('green', false, true);
};
String.prototype.brightYellow = function(): string {
  return String(this).applyCliColor('yellow', false, true);
};
String.prototype.brightBlue = function(): string {
  return String(this).applyCliColor('blue', false, true);
};
String.prototype.brightMagenta = function(): string {
  return String(this).applyCliColor('magenta', false, true);
};
String.prototype.brightCyan = function(): string {
  return String(this).applyCliColor('cyan', false, true);
};
String.prototype.brightWhite = function(): string {
  return String(this).applyCliColor('white', false, true);
};
String.prototype.grayBg = function(): string {
  return String(this).applyCliColor('black', true, true);
};
String.prototype.greyBg = function(): string {
  return String(this).applyCliColor('black', true, true);
};
String.prototype.brightBlackBg = function(): string {
  return String(this).applyCliColor('black', true, true);
};
String.prototype.brightRedBg = function(): string {
  return String(this).applyCliColor('red', true, true);
};
String.prototype.brightGreenBg = function(): string {
  return String(this).applyCliColor('green', true, true);
};
String.prototype.brightYellowBg = function(): string {
  return String(this).applyCliColor('yellow', true, true);
};
String.prototype.brightBlueBg = function(): string {
  return String(this).applyCliColor('blue', true, true);
};
String.prototype.brightMagentaBg = function(): string {
  return String(this).applyCliColor('magenta', true, true);
};
String.prototype.brightCyanBg = function(): string {
  return String(this).applyCliColor('cyan', true, true);
};
String.prototype.brightWhiteBg = function(): string {
  return String(this).applyCliColor('white', true, true);
};
String.prototype.return = function(): string {
  return `\x1b[1K${String(this)}`;
}
String.prototype.clear = function(): string {
  return `\x1bc${String(this)}`;
}
String.prototype.applyCliFormat = function(inCode: number, outCode: number): string {
  return `\x1b[${inCode}m${String(this)}\x1b[${outCode}m`;
}
String.prototype.applyCliColor = function(color: keyof typeof CliColor, background: boolean, bright: boolean): string {
  let inCode: number = CliColor[color] + 30;
  let outCode: number = 39;
  if (background) {
    inCode += 10;
    outCode += 10;
  }
  if (bright) {
    inCode += 60;
  }
  return String(this).applyCliFormat(inCode, outCode);
}
String.prototype.r = function(): string {
  return String(this).reset();
}
String.prototype.b = function(): string {
  return String(this).bold();
}
String.prototype.i = function(): string {
  return String(this).italicize();
}
String.prototype.u = function(): string {
  return String(this).underline();
}
String.prototype.s = function(): string {
  return String(this).strikethrough();
}
String.prototype.o = function(): string {
  return String(this).overline();
}
