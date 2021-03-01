import { injectable, inject } from 'inversify';
import { Stats } from 'fs';
import { IModuleService, Logger, Module, ServiceIdentifiers, ILoggingService, IModuleInfo, IEventService, EventHandler, ICommandService, Command, IConfigurationService } from '@satyrnidae/apdb-api';
import { checkDependenciesAsync, fsa, Mutex, forEachAsync, OneOrMany, toOneOrMany, Resolve, Reject } from '@satyrnidae/apdb-utils';
import { Candidates, ModuleCandidate } from './module/candidate-validation';
import * as tmp from 'tmp-promise';
import * as semver from 'semver';
import * as fs from 'fs'
import { dirname } from 'path';
import AdmZip from 'adm-zip';
import { CoreModule } from '../module/core-module';

tmp.setGracefulCleanup();

const Modules: Module[] = [];
const ModulesMutex: Mutex = new Mutex();

@injectable()
export class ModuleService implements IModuleService {
  private readonly log: Logger;

  constructor(@inject(ServiceIdentifiers.Logging) private readonly loggingService: ILoggingService,
    @inject(ServiceIdentifiers.Event) private readonly eventService: IEventService,
    @inject(ServiceIdentifiers.Command) private readonly commandService: ICommandService,
    @inject(ServiceIdentifiers.Configuration) private readonly configurationService: IConfigurationService) {
    this.log = loggingService.getLogger('core');
  }

  public async preInitialize(): Promise<void> {
    const loadModulesTask: Promise<void> = this.loadModules()
      .then(async (): Promise<void> => this.registerDependencies())
      .then(async (): Promise<void> => forEachAsync(Modules, async (module: Module): Promise<void> => module.preInitialize()));

    return loadModulesTask;
  }

  public async initialize(): Promise<void> {
    return forEachAsync(Modules, async (module: Module): Promise<void> => {
      await module.initialize();

      if (module.commands && module.commands.length) {
        module.commands.forEach((command: Command) => this.commandService.register(command));
      }

      if (module.events && module.events.length) {
        module.events.forEach((event: EventHandler) => this.eventService.registerEvent(event));
      }
    });
  }

  public async postInitialize(): Promise<void> {
    return forEachAsync(Modules, async (module: Module) => module.postInitialize());
  }

  public getAllModules(): OneOrMany<Module> {
    return toOneOrMany(new Array(...Modules));
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

    await ModulesMutex.dispatch(() => Modules.push(new CoreModule(this.log)));

    const moduleDirectories: string[] = await this.configurationService.getModuleDirectories();

    let modules: IModuleInfo[] = [];

    await forEachAsync(moduleDirectories, async(moduleDirectory: string): Promise<void> => {
      this.log.info(`Loading modules from directory '${moduleDirectory}'`);

      try {
        if (await fsa.existsAsync(moduleDirectory)) {
          const candidateFiles: string[] = await fsa.readdirAsync(moduleDirectory);
          modules.push(...(await this.verifyCandidates(...candidateFiles.map(file => <ModuleCandidate>{Directory: moduleDirectory, Name: file}))))
        } else {
          this.log.info(`Module directory ${moduleDirectory} was not found. Creating...`)
          fs.mkdir(moduleDirectory, (err: NodeJS.ErrnoException) => {
            if (err) {
              this.log.error(`Error while creating module directory: ${err}`);
            } else {
              this.log.info('Module directory created successfully.');
            }
          });
        }
      } catch (err) {
        this.log.error(err);
      }
    });

    return forEachAsync(modules, async (module: IModuleInfo): Promise<void> => this.loadModule(module));
  }

  private async verifyCandidates(...candidates: ModuleCandidate[]): Promise<IModuleInfo[]> {
    const modules: IModuleInfo[] = [];
    // Validate
    await forEachAsync(candidates, async (candidate: ModuleCandidate): Promise<void> => {
      try {
        const result = await Candidates.validateCandidate(candidate);
        if (result) {
          modules.push(result);
        }
      } catch (ex) {
        this.log.debug(`Unable to load module from ${candidate.Directory}/${candidate.Name}.`);
        this.log.trace(ex);
      }
    });

    // Sort by id and version preference
    modules.sort((a, b) => {
      const compare: number = a.id.localeCompare(b.id);
      if (compare === 0) {
        return -(semver.compare(a.version, b.version));
      }
      return -compare;
    });

    // De-duplicated list
    const deDuplicated: IModuleInfo[] = Array.from(new Set(modules.map(c => c.id)))
      .map(id => {
        const candidate = modules.find(c => c.id === id);
        this.log.info(`Loading module ${candidate.id}@${candidate.version} from ${candidate.details.path}.`);
        return candidate;
      });

    return deDuplicated;
  }

  private async registerDependencies(): Promise<void> {
    return forEachAsync(Modules, async (module: Module): Promise<void> => module.registerDependencies());
  }

  private async loadModule(moduleInfo: IModuleInfo): Promise<void> {
    let modulePath: string = moduleInfo.details.path;
    const stats: Stats = await fsa.lstatAsync(modulePath);
      if (!stats.isDirectory()) {
        if (stats.isFile) {
          const zippedFolder: AdmZip = new AdmZip(modulePath);

          // Create a new temp directory
          const directory: tmp.DirectoryResult = await tmp.dir({
            discardDescriptor: true,
            template: `tmp-XXXXXX`,
            unsafeCleanup: true,
            tmpdir: dirname(moduleInfo.details.path)
          });
          modulePath = directory.path;

          // Extract the files.
          await new Promise<void>((resolve: Resolve<void>, reject: Reject) => {
            zippedFolder.extractAllToAsync(directory.path, true, (error: Error) => {
              if (error) {
                reject(error);
              }
              resolve();
            });
          });
        } else {
          this.log.warn(`Failed to load module: ${moduleInfo.name}`);
          this.log.debug('The module path does not resolve to a directory.');
          return;
        }
      }

      const packageJsonExistsTask: Promise<boolean> = fsa.existsAsync(`${modulePath}/package.json`);
      if (!(await packageJsonExistsTask)) {
        this.log.warn(`Failed to load module: ${moduleInfo.name}`);
        this.log.debug('No package.json file exists.');
        return;
      }

      const mainFilePath: string = `${modulePath}/${moduleInfo.details.entryPoint}`;
      const mainFileExistsTask: Promise<boolean> = fsa.existsAsync(mainFilePath);
      if (!(await mainFileExistsTask)) {
        this.log.warn(`Failed to load module: ${moduleInfo.name}`);
        this.log.debug('The module specified an invalid main file.');
        return;
      }

      const installDependencies: Promise<any> = checkDependenciesAsync({
        packageDir: modulePath,
        scopeList: ['dependencies', 'peerDependencies'],
        install: true,
        verbose: true,
        log: (...data: any[]) => this.log.trace(...data),
        error: (...data: any[]) => this.log.warn(...data)
      });

      const log: Logger = this.loggingService.getLogger(moduleInfo.id);

      await installDependencies;
      const moduleImport: any = require(mainFilePath);
      const module: Module = new moduleImport.default(moduleInfo, log);
      if (!module || !(module instanceof Module)) {
        this.log.warn(`Failed to load module: ${moduleInfo.name}`);
        this.log.debug('Unable to construct the module.');
        return;
      }

      await ModulesMutex.dispatch(() => Modules.push(module));

      this.log.info(`Loaded new module: ${moduleInfo.id}@${moduleInfo.version}`);
  }
}
