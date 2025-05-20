"use client"

// Imports for getting server-side session

import { SidebarLayout } from "hasyx/components/sidebar/layout";
import sidebar from "@/app/sidebar";
import App from "@/app/app";  // Import the App component 

// Now this is an async server component
export default function Page() {
  return (
    <SidebarLayout sidebarData={sidebar} title={'/'}>
      <App />
    </SidebarLayout>
  );
}
