import { XMLHttpRequest } from 'xmlhttprequest';
import { Resolve, Reject } from '@satyrnidae/apdb-api';

const DEFAULT_REQUEST_TIMEOUT = 500;
const HTTP_STATUS_SUCCESS = 200;
const HTTP_STATUS_MULTIPLE_CHOICES = 300;

export namespace web {
  /**
   * Asynchronously calls an XMLHttpRequest. Promisifies XmlHttpRequest.open and onreadystatechanged.
   * @param method The HTTP method
   * @param url The URL to request
   * @param timeout Optionally, the timeout for request execution, in milliseconds. Defaults to 500.
   */
  export async function getHttpResponse(method: string, url: string, timeout: number = DEFAULT_REQUEST_TIMEOUT): Promise<XMLHttpRequest> {
    return new Promise<XMLHttpRequest>((resolve: Resolve<XMLHttpRequest>, reject: Reject) => {
      const xhr: XMLHttpRequest = new XMLHttpRequest();
      xhr.timeout = timeout;
      xhr.open(method, url);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === xhr.DONE) {
          if (xhr.status >= HTTP_STATUS_SUCCESS && xhr.status < HTTP_STATUS_MULTIPLE_CHOICES) {
            resolve(xhr);
          }
          else {
            reject(xhr.statusText);
          }
        }
      };
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send();
    });
  }
}
