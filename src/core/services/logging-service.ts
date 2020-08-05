import { injectable } from "inversify";
import { ILoggingService, Logger } from "@satyrnidae/apdb-api"

const Loggers: Logger[] = [new Logger('core', 'trace')];

@injectable()
export class LoggingService implements ILoggingService {
  public getLogger(loggerId: string): Logger {
    let logger: Logger = Loggers.find(l => l.getId() === loggerId);
    if (!logger) {
      logger = new Logger(loggerId);
      Loggers.push(logger);
    }

    return logger;
  }
}
