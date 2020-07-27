import { injectable } from "inversify";
import { LoggingService as ILoggingService, Logger } from "@satyrnidae/apdb-api"

const Loggers: Logger[] = [new Logger('core', 'trace')];

@injectable()
export class LoggingService implements ILoggingService {
    getLogger(loggerId: string): Logger {
        let logger: Logger = Loggers.find((logger) => logger.getId() == loggerId);
        if (!logger) {
            logger = new Logger(loggerId);
            Loggers.push(logger);
        }

        return logger;
    }
}