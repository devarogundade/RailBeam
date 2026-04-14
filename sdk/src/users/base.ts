import { BeamClient } from "../client";
import { Graph } from "../utils/graph";

export abstract class BaseUsers {
  protected readonly graph: Graph;
  protected readonly basePath: string = "/";

  constructor(client: BeamClient) {
    this.graph = new Graph(client);
  }
}

