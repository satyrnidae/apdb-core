import { injectable, inject } from "inversify";
import { IEventService, EventHandler, ServiceIdentifiers } from "@satyrnidae/apdb-api";
import { EventHandlerFunction } from "@satyrnidae/apdb-utils";
import { ClientService } from "./client-service";
import { Client, ClientEvents } from "discord.js";

@injectable()
export class EventService implements IEventService {

  private readonly client: Client;

  constructor(@inject(ServiceIdentifiers.Client) clientService: ClientService) {
    this.client = clientService.getClient();
  }

  public registerEvent(event: EventHandler): void {
    this.client.addListener(event.event, event.handler.bind(event));
  }

  public addListener(event: string, listener: EventHandlerFunction): void {
    this.client.addListener(event, listener);
  }

  public on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): void {
    this.client.on(event, listener);
  }
}
