import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { resolveShape } from "@/components/map/geometry";
import { RegionExplorer } from "@/components/map/RegionExplorer";
import type { MapRegion } from "@/components/map/types";
import { repo } from "@/lib/data";

/**
 * Explore Japan — plan v2 §7. The second way in: by place rather than by taste.
 *
 * Server-rendered. The regions, their map geometry and their sake lists are all
 * resolved here and handed down flattened, so the only thing that ships to the
 * client is the selection state — the same split the results and search screens
 * use. Region shapes come from the `regions` table (§10) rather than from
 * literals in the SVG, which is what makes the map staff-adjustable.
 */
export default async function MapPage() {
  const regions = await repo.listRegions();
  const sakeLists = await Promise.all(
    regions.map((region) => repo.listSakeByRegion(region.id)),
  );

  const mapRegions: MapRegion[] = regions.map((region, index) => ({
    id: region.id,
    name: region.name,
    nameJp: region.name_jp,
    description: region.description,
    shape: resolveShape(region, index),
    sake: sakeLists[index]
      // Out of stock is out of the list, exactly as in `topMatches`: this
      // screen's whole promise is a bottle a guest can walk over and find.
      // The panel has honest copy for a region that empties out.
      .filter((sake) => sake.in_stock)
      .map((sake) => ({
        id: sake.id,
        name: sake.name_en,
        sub: [sake.prefecture, sake.category].filter(Boolean).join(" · "),
      })),
  }));

  // No regions at all is a configuration problem, not an empty search. It gets
  // its own words rather than an empty map with nothing to tap.
  if (mapRegions.length === 0) {
    return (
      <main className="flex flex-1 flex-col">
        <BackButton />
        <PageHeader
          title="No regions to explore yet"
          subtitle="The regional map isn't set up. Try searching by name, or ask your server."
        />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <BackButton />
      <PageHeader
        title="Explore by region"
        subtitle="Tap a region of Japan to see its sake."
      />
      <RegionExplorer regions={mapRegions} />
    </main>
  );
}
