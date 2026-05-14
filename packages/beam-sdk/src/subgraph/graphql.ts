export type GraphQLErrorShape = { message: string };

export type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLErrorShape[];
};

export async function postGraphql<T>(
  subgraphUrl: string,
  query: string,
  variables: Record<string, unknown> | undefined,
  fetchImpl: typeof fetch,
): Promise<T> {
  const res = await fetchImpl(subgraphUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Subgraph HTTP ${res.status}: ${text.slice(0, 500) || res.statusText}`,
    );
  }

  const body = (await res.json()) as GraphQLResponse<T>;
  if (body.errors?.length) {
    throw new Error(
      body.errors.map((e) => e.message).join("; ") || "Subgraph GraphQL error",
    );
  }
  if (body.data === undefined) {
    throw new Error("Subgraph response missing data");
  }
  return body.data;
}
