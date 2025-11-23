"use client";

import * as React from "react";
import {
  IconCamera,
  IconDashboard,
  IconFileAi,
  IconFileDescription,
  IconHelp,
  IconSearch,
  IconSettings,
  IconBook,
  IconBadge,
  IconWorld
} from "@tabler/icons-react";
import { NavExams } from "@/components/sidebar/nav-exams";
import { NavMain } from "@/components/sidebar/nav-main";
import { NavSecondary } from "@/components/sidebar/nav-secondary";
import { NavUser } from "@/components/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: IconDashboard,
    },
    {
      title: "Courses",
      url: "/admin/courses",
      icon: IconBook,
    },

    // {
    //   title: "Carrier",
    //   url: "/admin/carrier",
    //   icon: IconBook,
    // },

    // {
    //   title: "Certification",
    //   url: "/admin/certification",
    //   icon: IconBook,
    // },

    {
      title: "Exams",
      url: "/admin/exams",
      icon: IconBook, // <---- icon need to be change
    },

    {
      title: "Jobs",
      url: "/admin/jobs",
      icon: IconBadge, // <---- Change this Icon
    },

     {
      title: "Services",
      url: "/admin/services",
      icon: IconHelp, // <--- Change this Icon
    },

    
    {
      title: "Communities",
      url: "/admin/communities",
      icon: IconWorld,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
   
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],

  exams: [ // remove this part.
    {
      title: "Concours",
      url: "/admin/concours",
      icon: IconBook,
    },
    {
      title: "GCE O/L-Sc",
      url: "/admin/gce-o/l-sc",
      icon: IconBook,
    },

    {
      title: "GCE O/L-Arts",
      url: "/admin/gce-o/l-art",
      icon: IconBook,
    },

    {
      title: "GCE O/L-Commercial",
      url: "/admin/gce-o/l-commercial",
      icon: IconBook,
    },

    {
      title: "GCE O/L-Technical",
      url: "/admin/gce-o/l-technical",
      icon: IconBook,
    },

    {
      title: "GCE-A/L Sc",
      url: "/admin/gce-a/l-sc",
      icon: IconBook,
    },

    {
      title: "GCE-A/L Arts",
      url: "/admin/gce-a/l-art",
      icon: IconBook,
    },

    {
      title: "GCE A/L-Commercial",
      url: "/admin/gce-a/l-commercial",
      icon: IconBook,
    },

    {
      title: "GCE A/L-Technical",
      url: "/admin/gce-a/l-technical",
      icon: IconBook,
    },

    {
      title: "BAC-C",
      url: "/admin/bac-c",
      icon: IconBook,
    },
    {
      title: "BAC-D",
      url: "/admin/bac-d",
      icon: IconBook,
    },
    {
      title: "BAC-A",
      url: "/admin/bac-a",
      icon: IconBook,
    },

    {
      title: "BAC-Technique",
      url: "/admin/bac-technique",
      icon: IconBook,
    },
    {
      title: "Probatoire-C",
      url: "/admin/probatoire-c",
      icon: IconBook,
    },

    {
      title: "Probatoire-D",
      url: "/admin/probatoire-d",
      icon: IconBook,
    },

    {
      title: "Probatoire-A",
      url: "/admin/probatoire-a",
      icon: IconBook,
    },

    {
      title: "Probatoire-Technique",
      url: "/admin/probatoire-technique",
      icon: IconBook,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <span className="text-base font-semibold">A-share</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavExams items={data.exams}/>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
