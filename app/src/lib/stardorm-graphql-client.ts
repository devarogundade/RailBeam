import { GraphQLClient } from "graphql-request";
import { z } from "zod";

const clients = new Map<string, GraphQLClient>();

function getStardormSubgraphClient(subgraphUrl: string): GraphQLClient {
  let client = clients.get(subgraphUrl);
  if (!client) {
    client = new GraphQLClient(subgraphUrl, {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
    });
    clients.set(subgraphUrl, client);
  }
  return client;
}

/** POST to the Stardorm subgraph and validate the top-level `data` object with Zod. */
export async function requestStardormSubgraph<T>(
  query: string,
  variables: Record<string, unknown> | undefined,
  schema: z.ZodType<T>,
  subgraphUrl: string,
): Promise<T> {
  const raw = await getStardormSubgraphClient(subgraphUrl).request<unknown>(query, variables ?? {});
  return schema.parse(raw);
}
