import '@shopify/ui-extensions/preact';
import { render } from "preact";

export default async () => {
  render(<Extension />, document.body)
};

// const FALLBACK_SRC =
//   "https://cdn.shopify.com/s/files/1/1149/0150/files/trust-signals-checkout.png?v=1788257387";

function Extension() {
  const badge = shopify.appMetafields.value.find(
    (entry) =>
      entry.target.type === "shop" &&
      entry.metafield.key === "trust_badge_image",
  );
  const src = badge?.metafield?.value;

  return (
    <s-box inlineSize="auto">
      <s-image
        src={src}
        alt="Trust signals"
        objectFit="contain"
        inlineSize="auto"
      ></s-image>
    </s-box>
  );
}
