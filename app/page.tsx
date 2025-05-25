"use client"

// Imports for getting server-side session

import { SidebarLayout } from "hasyx/components/sidebar/layout";
import sidebar from "@/app/sidebar";
import dynamic from "next/dynamic";
import pckg from "@/package.json";
import Client from "@/app/client";

// Now this is an async server component
export default function Page() {
  return (
    <SidebarLayout sidebarData={sidebar} breadcrumb={[{ title: pckg.name, link: '/' }]}>
      <Client />
    </SidebarLayout>
  );
}
