// Performs valdation of module candidates

import { IModuleInfo, IModuleDetails, IModulePackage, IModulePackageDetails } from "@satyrnidae/apdb-api";
import { fsa, Resolve } from "@satyrnidae/apdb-utils";
import { Stats } from "fs";
import AdmZip, { IZipEntry } from "adm-zip";
import { satisfies } from "semver";

type File = {
  fd: number,
  buffer: Buffer,
  size: number
}

export type ModuleCandidate = {
  Name: string,
  Directory: string
}

/**
 * Makes sure a candidate file is actually a zipped folder, and not some other thing.
 * @param candidateFile The candidate file name.
 * @param stats The candidate file stats.
 */
async function isZipCandidate(candidate: ModuleCandidate, stats: Stats): Promise<File> {
  // If the stats doesn't refer to a file, it can't refer to a zipped folder
  if (!stats.isFile()) {
    throw new Error('The candidate path points to a device, not a file.');
  }

  // This is probably too small to be a zip file
  if (stats.size < 22) {
    throw new Error('The candidate file is far too small to be a zip file.');
  }

  // try to load zip file
  const candidatePath: string = `${candidate.Directory}/${candidate.Name}`;
  const fd = await fsa.openAsync(candidatePath, 'r');
  const buffer: Buffer = Buffer.alloc(stats.size);
  await fsa.readAsync(fd, buffer, 0, stats.size, 0);

  // Validate the zip header is as we assume (0x04034B50, little-endian)
  if (!buffer.slice(0, 4).equals(new Uint8Array([0x50, 0x4B, 0x03, 0x04]))) {
    await fsa.closeAsync(fd);
    throw new Error('The candidate file header does not include the ZIP local file header signature.');
  }

  return { buffer, fd, size: stats.size };
}

async function readPackageJson(buffer: Buffer): Promise<IModuleInfo> {
  // Read package JSON
  const packageInfo: IModulePackage = JSON.parse(buffer.toString()) as IModulePackage;
  if (!packageInfo) {
    throw new Error('The package.json file could not be read.');
  }

  const dependencies: any = {
    ...packageInfo.dependencies,
    ...packageInfo.peerDependencies,
    ...packageInfo.optionalDependencies,
    ...packageInfo.devDependencies
  };

  const apiVersion: string = dependencies['@satyrnidae/apdb-api'];
  const packageModuleInfo: IModulePackageDetails = packageInfo['apdb-module'];
  if (!packageModuleInfo) {
    throw new Error(`The module "${packageInfo.name}" is not a valid plugin: missing apdb-module section in package.info`);
  }

  if (!satisfies((global as any).apiVersion, apiVersion)) {
    throw new Error(`The module was built with an incompatible version of the API (${(global as any).apiVersion} does not satisfy ${apiVersion})`);
  }

  const packageAuthors: string[] = [];
  const author: string = packageInfo.author;
  const contributors: string[] = packageInfo.contributors;
  if (author) {
    packageAuthors.push(author);
  }
  if (contributors && contributors.length > 0) {
    packageAuthors.push(...contributors);
  }

  return <IModuleInfo>{
    id: packageModuleInfo.id,
    name: packageModuleInfo.name,
    version: packageInfo.version,
    details: <IModuleDetails>{
      apiVersion: apiVersion,
      authors: packageAuthors,
      description: packageInfo.description,
      entryPoint: packageInfo.main,
      website: packageInfo.homepage
    }
  };
}

async function readZipPackageJSON(zippedFolder: AdmZip): Promise<IModuleInfo> {
  const packageJson: IZipEntry = zippedFolder.getEntry('package.json');
  if (!packageJson) {
    throw new Error('No package.json file exists.');
  }
  const packageJsonData: Buffer = await new Promise<Buffer>((resolve: Resolve<Buffer>) => {
    packageJson.getDataAsync(resolve);
  });
  return readPackageJson(packageJsonData);
}

async function getFileCandidate(candidate: ModuleCandidate, stats: Stats): Promise<IModuleInfo> {
  let fd: number = -1;
  let result: IModuleInfo = null;
  try {
    const isZipResult: File = await isZipCandidate(candidate, stats);
    fd = isZipResult.fd;

    // Get the module info from the package zip... but we aren't done yet.
    const zippedFolder: AdmZip = new AdmZip(isZipResult.buffer);
    result = await readZipPackageJSON(zippedFolder);
    result.details.path = `${candidate.Directory}/${candidate.Name}`;
    result.details.containerName = candidate.Name;

    const mainFile: IZipEntry = zippedFolder.getEntry(result.details.entryPoint);
    if (!mainFile) {
      throw new Error('The module specified an invalid main file.');
    }
    return result;
  } finally {
    if (fd > 0) {
      await fsa.closeAsync(fd);
    }
  }
}

async function getDirectoryCandidate(candidate: ModuleCandidate, stats: Stats): Promise<IModuleInfo> {
  const candidatePath: string = `${candidate.Directory}/${candidate.Name}`;
  const packageJsonExistsTask: Promise<boolean> = fsa.existsAsync(`${candidatePath}/package.json`);
  if (!(await packageJsonExistsTask)) {
    throw new Error('No package.json file exists.');
  }

  const packageJson: Buffer = await fsa.readFileAsync(`${candidatePath}/package.json`);
  const result = await readPackageJson(packageJson);
  result.details.path = candidatePath;
  result.details.containerName = candidate.Name;

  return result;
}

export namespace Candidates {
  export async function validateCandidate(candidate: ModuleCandidate): Promise<IModuleInfo> {
    const candidatePath: string = `${candidate.Directory}/${candidate.Name}`;
    const stats: Stats = await fsa.lstatAsync(candidatePath);

    // Make sure we're dealing with a directory. If not hand off to the subloader to try to extract the zipped module.
    if (!stats.isDirectory()) {
      return getFileCandidate(candidate, stats);
    }
    return getDirectoryCandidate(candidate, stats);
  }
}
