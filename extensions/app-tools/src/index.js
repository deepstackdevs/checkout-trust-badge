import { fetchTrustBadgeImageUrl } from '../../../shared/models/trust-badge';

export default () => {
  shopify.tools.register('get_trust_badge_image', async () => {
    return {
      imageUrl: await fetchTrustBadgeImageUrl(),
    };
  });
};
