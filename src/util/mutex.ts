import { Resolve } from "@satyrnidae/apdb-api";

export class Mutex<T> {
  private mutex = Promise.resolve();

  private lock(): PromiseLike<() => void> {
    let begin: (unlock: () => void) => void = () => {};

    this.mutex = this.mutex.then(() => new Promise(begin));

    return new Promise((resolve: Resolve<() => void | PromiseLike<() => void>>) => {
      begin = resolve;
    });
  }

  public async dispatch(fn: (() => T) | (()=> PromiseLike<T>)): Promise<T> {
    const unlock = await this.lock();
    try {
      return Promise.resolve(fn());
    } finally {
      unlock();
    }
  }
}
