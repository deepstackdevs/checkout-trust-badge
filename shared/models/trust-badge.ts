const API_PATH = "shopify:admin/api/2026-07/graphql.json";
const METAFIELD_KEY = "trust_badge_image";
const POLL_ATTEMPTS = 20;
const POLL_DELAY_MS = 500;

type GqlError = { message?: string };
type UserError = { field?: string[] | null; message?: string };

type GqlResponse<T> = {
  data?: T;
  errors?: GqlError[];
};

async function gqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(API_PATH, {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  });
  const json = (await response.json()) as GqlResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "GraphQL request failed");
  }
  if (!json.data) {
    throw new Error("GraphQL request returned no data");
  }
  return json.data;
}

function firstUserError(errors?: UserError[] | null): string | null {
  return errors?.[0]?.message ?? null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTrustBadgeImageUrl(): Promise<string | null> {
  const data = await gqlFetch<{
    shop: { trustBadgeImage?: { jsonValue?: string | null } | null };
  }>(`#graphql
    query TrustBadgeImage {
      shop {
        trustBadgeImage: metafield(key: "trust_badge_image") {
          jsonValue
        }
      }
    }`);

  const value = data.shop.trustBadgeImage?.jsonValue;
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function fetchShopId(): Promise<string> {
  const data = await gqlFetch<{ shop: { id: string } }>(`#graphql
    query TrustBadgeShop {
      shop {
        id
      }
    }`);
  return data.shop.id;
}

export async function saveTrustBadgeImageUrl(url: string): Promise<void> {
  const ownerId = await fetchShopId();
  const data = await gqlFetch<{
    metafieldsSet: { userErrors: UserError[] };
  }>(
    `#graphql
    mutation TrustBadgeMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors {
          field
          message
        }
      }
    }`,
    {
      metafields: [
        {
          ownerId,
          key: METAFIELD_KEY,
          type: "url",
          value: url,
        },
      ],
    },
  );

  const error = firstUserError(data.metafieldsSet.userErrors);
  if (error) throw new Error(error);
}

async function fetchFileImageUrl(fileId: string): Promise<string> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const data = await gqlFetch<{
      node: {
        fileStatus?: string | null;
        url?: string | null;
        image?: { url?: string | null } | null;
        preview?: { image?: { url?: string | null } | null } | null;
      } | null;
    }>(
      `#graphql
      query TrustBadgeFile($id: ID!) {
        node(id: $id) {
          ... on File {
            fileStatus
            preview {
              image {
                url
              }
            }
          }
          ... on MediaImage {
            image {
              url
            }
          }
          ... on GenericFile {
            url
          }
        }
      }`,
      { id: fileId },
    );

    const node = data.node;
    const url =
      node?.image?.url ?? node?.preview?.image?.url ?? node?.url ?? null;
    if (node?.fileStatus === "FAILED") {
      throw new Error("This file could not be used. Pick another image.");
    }
    if (url) return url;
    await sleep(POLL_DELAY_MS);
  }

  throw new Error("This image is still processing. Try again in a moment.");
}

export async function selectTrustBadgeFromShopifyFile(
  fileId: string,
): Promise<string> {
  const imageUrl = await fetchFileImageUrl(fileId);
  await saveTrustBadgeImageUrl(imageUrl);
  return imageUrl;
}
