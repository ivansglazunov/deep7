import { SidebarData } from "hasyx/components/sidebar";
import pckg from "@/package.json";

// Import static documentation navigation
let docNavigation: any = null;
try {
  docNavigation = require("./hasyx/doc/md.json");
} catch (error) {
  console.warn("Documentation navigation not found, will be populated dynamically");
}

export const sidebar: SidebarData = {
  name: pckg.name,
  version: pckg.version,
  logo: "logo.svg",
  navMain: [
    {
      title: "🪬 Deep7",
      url: "#",
      items: [
        {
          title: "🟢 Cyto",
          url: "/deep7/cyto",
        },
        {
          title: "🔴 Deeps",
          url: "/deep7/deeps",
        },
      ],
    },
    {
      title: "😈 Hasyx",
      url: "#",
      items: [
        {
          title: "🧪 Diagnostics",
          url: "/hasyx/diagnostics",
        },
        {
          title: "🟡 PWA Diagnostics",
          url: "/hasyx/pwa",
        },
        {
          title: "🟢 Constructor",
          url: "/hasyx/constructor",
        },
        {
          title: "🟠 A-Frame",
          url: "/hasyx/aframe",
        },
        {
          title: "🟢 Cyto",
          url: "/hasyx/cyto",
        },
        {
          title: "🟡 Payments",
          url: "/hasyx/payments",
        },
      ],
    },
    // Add documentation section with collapse functionality
    {
      title: "📚 Documentation",
      url: "/hasyx/doc",
      items: docNavigation?.items || [],
    },
  ],
};

export default sidebar;