"use client";

import { SidebarLayout } from "hasyx/components/sidebar/layout";
import sidebar from "@/app/sidebar";
import pckg from "@/package.json";
import VoiceClient from "./client"; // Assuming client.tsx will be created

export default function VoicePage() {
  return (
    <SidebarLayout sidebarData={sidebar} breadcrumb={[{ title: "Voice Assistant", link: '/voice' }]}>
      <VoiceClient />
    </SidebarLayout>
  );
} 