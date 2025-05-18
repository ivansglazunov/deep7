import { SidebarData } from "hasyx/components/sidebar";
import pckg from "hasyx/package.json";

export const sidebar: SidebarData = {
  name: pckg.name,
  version: pckg.version,
  logo: "logo.svg",
  navMain: [
    {
      title: "Deep7",
      url: "#",
      items: [
        {
          title: "Index",
          url: "/",
        },
      ],
    },
    {
      title: "Hasyx",
      url: "#",
      items: [
        {
          title: "Diagnostics",
          url: "/hasyx/diagnostics",
        },
        {
          title: "A-Frame",
          url: "/hasyx/aframe",
        },
      ],
    },
  ],
};

export default sidebar;