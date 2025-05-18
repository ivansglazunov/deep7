import authOptions from "@/app/options";

import useSsr, { SsrResult } from "hasyx/lib/ssr";
import Client from "./client";

export default async function Page() {
  const { session } = await useSsr(authOptions) as SsrResult;
  return (
    <Client />
  );
}
