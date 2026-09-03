import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/index.js' {
  interface GetTrustBadgeImageInput {
    [k: string]: unknown;
  }

  interface GetTrustBadgeImageOutput {
    /**
     * Public URL of the checkout trust badge image, or null if none is uploaded
     */
    imageUrl?: string | null;
    [k: string]: unknown;
  }

  interface ShopifyTools {
    /**
     * Get the checkout trust badge image currently configured by the merchant
     */
    register(
      name: 'get_trust_badge_image',
      handler: (
        input: GetTrustBadgeImageInput,
      ) => GetTrustBadgeImageOutput | Promise<GetTrustBadgeImageOutput>,
    ): () => void;
  }

  const shopify: import('@shopify/ui-extensions/admin').WithGeneratedTools<
    import('@shopify/ui-extensions/admin.app.tools.data').Api,
    ShopifyTools
  >;
  const globalThis: { shopify: typeof shopify };
}
