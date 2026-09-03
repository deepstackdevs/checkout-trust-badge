import {useState, useEffect} from 'preact/hooks';
import {
  fetchTrustBadgeImageUrl,
  selectTrustBadgeFromShopifyFile,
} from '../../../../shared/models/trust-badge';

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function firstGid(value) {
  const stack = /** @type {unknown[]} */ ([value]);
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current === 'string' && current.includes('gid://shopify/')) {
      return current;
    }
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }
    if (current && typeof current === 'object') {
      for (const nested of Object.values(
        /** @type {Record<string, unknown>} */ (current),
      )) {
        stack.push(nested);
      }
    }
  }
  return null;
}

/**
 * @param {unknown} activity
 */
async function resolvePickerResponse(activity) {
  if (!activity || typeof activity !== 'object') return activity;
  const handle = /** @type {{complete?: unknown, then?: unknown}} */ (activity);
  const pending =
    typeof handle.complete === 'function'
      ? handle.complete()
      : handle.complete;
  if (pending != null && typeof pending === 'object' && 'then' in pending) {
    return await pending;
  }
  if (typeof handle.then === 'function') {
    return await handle;
  }
  return activity;
}

export default function HomePage() {
  const [imageUrl, setImageUrl] = useState(/** @type {string | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    (async () => {
      try {
        shopify.loading(true);
        setImageUrl(await fetchTrustBadgeImageUrl());
      } catch (_) {
        setError('Could not load the current trust badge.');
      } finally {
        setLoading(false);
        shopify.loading(false);
      }
    })();
  }, []);

  const handlePickFile = async () => {
    if (picking) return;
    if (!shopify.intents.invoke) {
      setError('Shopify file picker is not available.');
      return;
    }

    setError(null);
    setPicking(true);

    try {
      const activity = await shopify.intents.invoke('pick:shopify/File', {
        data: {mediaTypes: ['MediaImage'], multiSelect: false},
      });
      const response = await resolvePickerResponse(activity);
      const payload = /** @type {{code?: string, message?: string, data?: unknown}} */ (
        response ?? {}
      );

      if (!response || payload.code === 'closed') {
        return;
      }
      if (payload.code === 'error') {
        throw new Error(payload.message || 'Could not open Shopify Files.');
      }

      const fileId = firstGid(payload.data ?? payload);
      if (!fileId) {
        throw new Error('No image was selected.');
      }

      shopify.loading(true);
      const nextUrl = await selectTrustBadgeFromShopifyFile(fileId);
      setImageUrl(nextUrl);
      shopify.toast.show('Checkout trust badge updated');
    } catch (pickError) {
      const message =
        pickError instanceof Error
          ? pickError.message
          : 'Could not update the trust badge.';
      setError(message);
      shopify.toast.show(message, {isError: true});
    } finally {
      setPicking(false);
      shopify.loading(false);
    }
  };

  const actionLabel = imageUrl ? 'Change image' : 'Select image';

  return (
    <s-page heading="Checkout trust badge" inlineSize="base">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handlePickFile}
        loading={picking}
        disabled={loading}
      >
        {actionLabel}
      </s-button>

      {error && (
        <s-banner tone="critical" dismissible>
          {error}
        </s-banner>
      )}

      <s-section heading="Badge image">
        <s-stack gap="base">
          <s-paragraph color="subdued">
            Shown in checkout after discounts. Choose an image from Shopify
            Files.
          </s-paragraph>

          {loading && (
            <s-box padding="large">
              <s-stack alignItems="center">
                <s-spinner accessibilityLabel="Loading trust badge" />
              </s-stack>
            </s-box>
          )}

          {!loading && imageUrl && (
            <s-box
              key={imageUrl}
              border="base"
              borderRadius="base"
              overflow="hidden"
            >
              <s-box padding="small" background="subdued">
                <s-stack alignItems="center">
                  <s-image
                    src={imageUrl}
                    alt="Checkout trust badge"
                    inlineSize="auto"
                    objectFit="contain"
                  />
                </s-stack>
              </s-box>
              <s-divider />
              <s-box padding="base">
                <s-grid
                  gridTemplateColumns="1fr auto"
                  gap="base"
                  alignItems="center"
                >
                  <s-paragraph color="subdued">
                    Updates appear on the next checkout session.
                  </s-paragraph>
                  <s-button
                    variant="primary"
                    onClick={handlePickFile}
                    loading={picking}
                  >
                    {actionLabel}
                  </s-button>
                </s-grid>
              </s-box>
            </s-box>
          )}

          {!loading && !imageUrl && (
            <s-box
              border="base"
              borderRadius="base"
              padding="large-400"
              background="subdued"
            >
              <s-stack gap="base" alignItems="center">
                <s-heading>No image selected</s-heading>
                <s-paragraph color="subdued">
                  Pick a file from Shopify Files to show in checkout.
                </s-paragraph>
                <s-button
                  variant="primary"
                  onClick={handlePickFile}
                  loading={picking}
                >
                  {actionLabel}
                </s-button>
              </s-stack>
            </s-box>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}
