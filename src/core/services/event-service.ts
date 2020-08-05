import { injectable, inject } from "inversify";
import { IEventService, EventHandler, ServiceIdentifiers } from "@satyrnidae/apdb-api";
import { EventHandlerFunction } from "@satyrnidae/apdb-utils";
import { ClientService } from "./client-service";
import { Client } from "discord.js";

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

  public on(event: string, listener: Function): void {
    this.client.on(event, listener);
  }
}
