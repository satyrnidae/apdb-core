import { ModuleService as IModuleService, ServiceIdentifiers, EventService, CommandService, Module, FsAsync, forEachAsync, Command, EventHandler, OneOrMany, LoggingService, Logger, toOneOrMany, toOne, ModuleInfo } from '@satyrnidae/apdb-api';
import { injectable, inject } from 'inversify';
import { lstatSync, readdirSync, Stats, read } from 'fs';
import * as semver from 'semver';

const Modules: Module[] = [];

@injectable()
export class ModuleService implements IModuleService {
  private readonly log: Logger;

  constructor(//@inject(ServiceIdentifiers.Event) private eventService: EventService,
    //@inject(ServiceIdentifiers.Command) private commandService: CommandService,
    @inject(ServiceIdentifiers.Logging) loggingService: LoggingService) {
    this.log = loggingService.getLogger('core');
  }

  public async preInitialize(): Promise<void> {
    await this.loadModules();
    await this.registerDependencies();

    return forEachAsync(Modules, async (module: Module): Promise<void> => module.preInitialize());
  }

  public async initialize(): Promise<void> {
    return forEachAsync(Modules, async (module: Module): Promise<void> => {
      await module.initialize();

      if (module.commands && module.commands.length) {
        //module.commands.forEach((command: Command) => this.commandService.register(command));
      }

      if (module.events && module.events.length) {
        //module.events.forEach((event: EventHandler) => this.eventService.registerEvent(event));
      }
    });
  }

  public async postInitialize(): Promise<void> {
    return forEachAsync(Modules, async (module: Module) => module.postInitialize());
  }

  public getAllModules(): OneOrMany<Module> {
    return new Array(...Modules);
  }

  public getModuleById(moduleId: string): Module {
    const filteredModules: Module[] = Modules.filter((module: Module) => module.moduleInfo.id === moduleId);
    return filteredModules && filteredModules.length ? filteredModules[0] : null;
  }

  public getModulesByName(moduleName: string): OneOrMany<Module> {
    return Modules.filter((module: Module) => module.moduleInfo.name === moduleName);
  }

  public getModulesByIdOrName(moduleIdOrName: string): OneOrMany<Module> {
    const module: Module = this.getModuleById(moduleIdOrName);
    if (!module) {
      return this.getModulesByName(moduleIdOrName);
    }
    return module;
  }

  private async loadModules(): Promise<void> {
    this.log.info(`Loading modules from directory '${(global as any).moduleDirectory}'`);

    const moduleFolders: string[] = await FsAsync.readdirAsync((global as any).moduleDirectory);

    return forEachAsync(moduleFolders, async (moduleFolder: string): Promise<void> => this.loadModule(moduleFolder));
  }

  private async registerDependencies(): Promise<void> {
    return forEachAsync(Modules, async (module: Module): Promise<void> => module.registerDependencies());
  }

  private async loadModule(moduleFolder: string): Promise<void> {
    try {
      const modulePath: string = `${(global as any).moduleDirectory}/${moduleFolder}`;
      const modulePathLstatTask: Promise<Stats> = FsAsync.lstatAsync(modulePath);
      if (!(await modulePathLstatTask).isDirectory()) {
        this.log.warn(`Not a valid module: ${moduleFolder}`);
        this.log.debug('The module path does not resolve to a directory.');
        return;
      }

      const packageJsonExistsTask: Promise<boolean> = FsAsync.existsAsync(`${modulePath}/package.json`);
      if (!(await packageJsonExistsTask)) {
        this.log.warn(`Not a valid module: ${moduleFolder}`);
        this.log.debug('No package.json file exists.');
        return;
      }

      const readPackageJsonTask: Promise<Buffer> = FsAsync.readFileAsync(`${modulePath}/package.json`);
      const packageInfo: any = JSON.parse((await readPackageJsonTask).toString());
      if (!packageInfo) {
        this.log.warn(`Not a valid module: ${moduleFolder}`);
        this.log.debug('The package.json file could not be read.');
      }

      const apiVersion: string = packageInfo.dependencies['@satyrnidae/apdb-api'] as string;
      if (!semver.satisfies((global as any).apiVersion, apiVersion)) {
        this.log.warn(`Not a valid module: ${moduleFolder}`);
        this.log.debug(`The module was built with an incompatible version of the API (${(global as any).apiVersion} does not satisfy ${apiVersion})`);
      }


    } catch (ex) {
      this.log.error(`Not a valid module: ${moduleFolder}`);
      this.log.debug(ex);
    }
  }
}
