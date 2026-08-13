import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SakeForm } from "@/components/admin/SakeForm";
import { PageHeader } from "@/components/PageHeader";
import { repo } from "@/lib/data";

/** Create a sake — same form component as the edit screen (plan v2 §11). */
export default async function NewSakePage() {
  const regions = await repo.listRegions();

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        className="mt-6 mb-4"
        title="Add a sake"
        subtitle="Name and fridge number are the two the guest app cannot do without."
      />

      <SakeForm sake={null} regions={regions} />

      <Link
        href="/admin"
        className="mt-6 inline-flex items-center gap-1.5 self-start text-[12.5px] text-muted transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Back to the list
      </Link>
    </main>
  );
}
