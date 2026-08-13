import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { DeleteSakeButton } from "@/components/admin/DeleteSakeButton";
import { SakeForm } from "@/components/admin/SakeForm";
import { PageHeader } from "@/components/PageHeader";
import { repo } from "@/lib/data";

/** Edit one sake — plan v2 §11. */
export default async function EditSakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [sake, regions] = await Promise.all([
    repo.getSake(id),
    repo.listRegions(),
  ]);

  if (!sake) notFound();

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        className="mt-6 mb-4"
        title={sake.name_en}
        subtitle={`Fridge #${sake.fridge_number}${sake.in_stock ? "" : " · out of stock"}`}
      />

      <SakeForm sake={sake} regions={regions} />

      <div className="mt-7 flex flex-col gap-4 border-t border-cream/10 pt-5">
        <DeleteSakeButton id={sake.id} name={sake.name_en} />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-muted transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Back to the list
          </Link>
          <Link
            href={`/sake/${sake.id}`}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-muted transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            See the guest view
          </Link>
        </div>
      </div>
    </main>
  );
}
