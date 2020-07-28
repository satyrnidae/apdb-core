import { resolve } from "path";
import { readFileSync } from "fs";
import * as semver from 'semver';
import { Container, ILoggingService, IModuleService, ServiceIdentifiers } from "@satyrnidae/apdb-api";
import { LoggingService } from "./core/services/logging-service";
import { ModuleService } from "./core/services/module-service";
import { Robot } from "./core/robot";

const packageInfo: any = JSON.parse(readFileSync('package.json').toString());

(global as any).moduleDirectory = resolve(`${__dirname}/../modules`);
(global as any).apiVersion = semver.clean((packageInfo.dependencies['@satyrnidae/apdb-api'] as string).replace('^', ''));

Container.bind<ILoggingService>(ServiceIdentifiers.Logging).to(LoggingService);
Container.bind<IModuleService>(ServiceIdentifiers.Module).to(ModuleService);

Container.bind<Robot>(Robot).toSelf().inSingletonScope();

const log = Container.resolve<ILoggingService>(LoggingService).getLogger('core');
const robot = Container.resolve<Robot>(Robot);

log.info('╔═════════════════════════════════════════════╗');
log.info('║                                             ║');
log.info('║        Another Pluggable Discord Bot        ║');
log.info('║        ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾        ║');
log.info('║                            │╲▁╱╲            ║');
log.info('║                          ╷─┘    ╲      ▁▁▁  ║');
log.info('║                           ╲▁   ▁╱     ╱╲ │  ║');
log.info('║  (c) 2020 Isabel Maskrey    ╱   ╲▁▁▁ ╱  ╲│  ║');
log.info('║  All rights reserved       ╱        ╲│  ╱   ║');
log.info('║                            │ │ │ ╱     ╱    ║');
log.info('║                            │ │ │ ╲  ╱▁╱     ║');
log.info('║                            ╱▁╱▁╱▁╱▁▁╱       ║');
log.info('║                                             ║');
log.info('╚═════════════════════════════════════════════╝');
log.info();
log.info(`Version ${packageInfo.version}`);
log.info(`API Version ${(global as any).apiVersion}`);
log.info();

robot.preInitialize()
    .then(() => robot.initialize())
    .then(() => robot.postInitialize())
    .then(() => robot.run())
    .catch(reason => log.error(reason))
    .finally(() => {
        log.info('Service Started');
    });
