// Imports for getting server-side session
import authOptions from "@/app/options"

import sidebar from "@/app/sidebar"
import useSsr, { SsrResult } from "hasyx/lib/ssr"

import { SidebarLayout } from "hasyx/components/sidebar/layout"
import Client from "./client"

export default async function Page() {
  // Get session on the server
  const { session } = await useSsr(authOptions) as SsrResult;
  // const session = null;
  return (
    <SidebarLayout sidebarData={sidebar} title={'/'}>
      <Client />
    </SidebarLayout>
  )
}
