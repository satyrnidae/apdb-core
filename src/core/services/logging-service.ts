import { injectable } from "inversify";
import { IConfigurationService, ILoggingService, Logger, ServiceIdentifiers } from "@satyrnidae/apdb-api"
import { inject } from "inversify";
import { IAppConfiguration } from "./configuration/app-configuration";

const Loggers: Logger[] = [];

@injectable()
export class LoggingService implements ILoggingService {

  constructor(@inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService<IAppConfiguration>) {}

  public getLogger(loggerId: string): Logger {
    let logger: Logger = Loggers.find(l => l.getId() === loggerId);
    if (!logger) {
      logger = new Logger(loggerId);
      this.configurationService.get('logLevel').then(logLevel => logger.setLogLevel(logLevel));
      Loggers.push(logger);
    }

    return logger;
  }
}
