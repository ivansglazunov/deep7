"use client"

import sidebar from "@/app/sidebar";
import pckg from "@/package.json";
import { SidebarLayout } from "hasyx/components/sidebar/layout";
import dynamic from "next/dynamic";
import { DeepProvider } from "@/lib/react";
import { useParams } from "next/navigation";

const Client = dynamic(() => import("./client"), { ssr: false });

export default function Page() {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;

  return (
    <SidebarLayout sidebarData={sidebar} breadcrumb={[{ title: pckg.name, link: '/' }, { title: 'deeps', link: '/deep7/deeps' }, { title: uuid, link: `/deep7/deeps/${uuid}`}]}>
      {!!uuid && <DeepProvider id={uuid}>
        <Client />
      </DeepProvider>}
    </SidebarLayout>
  );
} 