"use client"

import sidebar from "@/app/sidebar";
import pckg from "@/package.json";
import { SidebarLayout } from "hasyx/components/sidebar/layout";
import { useQuery } from "hasyx";
import { Button as EntityButton } from '@/lib/entities';
import Link from "next/link";

function DeepsGrid() {
  const { data: deeps, loading, error } = useQuery({
    table: 'deep_links',
    where: { type_id: { _is_null: true } },
    returning: ['id']
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {deeps?.map((deep: any) => (
        <Link key={deep.id} href={`/deep7/deeps/${deep.id}`}>
          <EntityButton data={deep} />
        </Link>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <SidebarLayout sidebarData={sidebar} breadcrumb={[{ title: pckg.name, link: '/' }, { title: 'deeps', link: '/deep7/deeps' }]}>
      <DeepsGrid />
    </SidebarLayout>
  );
} 