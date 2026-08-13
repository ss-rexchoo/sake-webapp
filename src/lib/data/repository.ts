import type {
  Region,
  Sake,
  SakeCreateInput,
  SakeUpdateInput,
} from "@/lib/types";

/**
 * The single seam between the app and its data source.
 *
 * Everything in the app talks to a `SakeRepository`, never to `pg` or to the
 * mock seed directly. Swapping the in-memory implementation for the real
 * Postgres one is a one-line change in `./index.ts`.
 */
export interface SakeRepository {
  listSake(): Promise<Sake[]>;
  getSake(id: string): Promise<Sake | null>;

  listRegions(): Promise<Region[]>;
  getRegion(id: string): Promise<Region | null>;
  listSakeByRegion(regionId: string): Promise<Sake[]>;

  /** Plain case-insensitive substring match — see plan v2 §8. */
  searchSake(query: string): Promise<Sake[]>;

  createSake(input: SakeCreateInput): Promise<Sake>;
  updateSake(id: string, patch: SakeUpdateInput): Promise<Sake>;
  deleteSake(id: string): Promise<void>;
}
