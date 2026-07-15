/** Renders a loot item's icon: its uploaded image if present, otherwise the emoji fallback
 *  for its type. Framed with the rarity color so drops read at a glance. */
import { ITEM_TYPE_MAP, type ItemType } from "@/lib/itemType";
import { RARITY_MAP, type Rarity } from "@/lib/rarity";

export default function ItemIcon({
  imageUrl,
  itemType,
  rarity,
  size = 40,
}: {
  imageUrl?: string | null;
  itemType?: ItemType;
  rarity: Rarity;
  size?: number;
}) {
  const rarityMeta = RARITY_MAP[rarity];
  const typeMeta = itemType ? ITEM_TYPE_MAP[itemType] : null;

  return (
    <span
      className="pixel-corner-sm inline-flex shrink-0 items-center justify-center overflow-hidden border"
      style={{
        width: size,
        height: size,
        borderColor: `${rarityMeta.color}66`,
        background: `linear-gradient(180deg, ${rarityMeta.color}22, transparent)`,
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{typeMeta?.icon ?? "🎁"}</span>
      )}
    </span>
  );
}
