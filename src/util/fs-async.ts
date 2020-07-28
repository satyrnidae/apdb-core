import * as _ from 'fs';
import { Resolve, Reject } from '@satyrnidae/apdb-api';

type ReadDirOptions = {
  encoding: BufferEncoding;
  withFileTypes?: false;
} | 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex';

type ReadFileOptions = {
  encoding?: string;
  flag?: string
};

type ReadResult = {
  read: number,
  buffer: Buffer
}

type WriteResult = {
  written: number,
  buffer: Buffer
}

export namespace fsa {
  /**
   * Asynchrounously reads the contents of a file. Promisifies fs.readFile from the fs package.
   * @param path The path of the file to read
   * @param options Read options for the file
   */
  export async function readFileAsync(path: _.PathLike, options?: ReadFileOptions): Promise<Buffer> {
    return new Promise<Buffer>((resolve: Resolve<Buffer>, reject: Reject) => {
      _.readFile(path, options, (err: NodeJS.ErrnoException, data: Buffer) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    });
  }

  /**
   * Asynchronously gathers a listing for the specified directory. Promisifies fs.readFile from the fs package.
   * @param path The path of the directory to list
   * @param options Read options for the directory
   */
  export async function readdirAsync(path: _.PathLike, options?: ReadDirOptions): Promise<string[]> {
    return new Promise<string[]>((resolve: Resolve<string[]>, reject: Reject) => {
      _.readdir(path, options, (err: NodeJS.ErrnoException, files: string[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(files);
      });
    });
  }

  /**
   * Asynchronously returns the stats of a file. Promisifies fs.lstat.
   * @param path The path of the file to stat
   */
  export async function lstatAsync(path: _.PathLike): Promise<_.Stats> {
    return new Promise<_.Stats>((resolve: Resolve<_.Stats>, reject: Reject) => {
      _.lstat(path, (err: NodeJS.ErrnoException, stats: _.Stats) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stats);
      });
    });
  }

  /**
   * Asynchronously checks if a file or directory exists. Promisifies fs.exists.
   * @param path The path of the file or directory.
   */
  export async function existsAsync(path: _.PathLike): Promise<boolean> {
    return new Promise<boolean>((resolve: Resolve<boolean>) => {
      _.exists(path, (exists: boolean) => resolve(exists));
    });
  }

  export async function openAsync(path: _.PathLike, flags: string, mode: number = 0o666): Promise<number> {
    return new Promise<number>((resolve: Resolve<number>, reject: Reject) => {
      _.open(path, flags, mode, (err, fd) => {
        if (err) {
          reject(err);
        }
        resolve(fd);
      });
    });
  }

  export async function readAsync(fd: number, buffer: Buffer, offset: number, length: number, position: number): Promise<ReadResult> {
    return new Promise<ReadResult>((resolve: Resolve<ReadResult>, reject: Reject) => {
      _.read(fd, buffer, offset, length, position, (err, read, buffer) => {
        if (err) {
          reject(err);
        }
        resolve({ read, buffer });
      });
    });
  }

  export async function writeAsync(fd: number, buffer: Buffer, offset: number, length: number, position: number): Promise<WriteResult> {
    return new Promise<WriteResult>((resolve: Resolve<WriteResult>, reject: Reject) => {
      _.write(fd, buffer, offset, length, position, (err, written, buffer) => {
        if (err) {
          reject(err);
        }
        resolve({ written, buffer });
      });
    });
  }

  export async function closeAsync(fd: number): Promise<void> {
    return new Promise<void>((resolve: Resolve<void>, reject: Reject) => {
      _.close(fd, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }
}