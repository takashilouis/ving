import type { Metadata } from "next";
import ArchivedTemplateStudio from "@/components/templates/ArchivedTemplateStudio";

export const metadata: Metadata = {
  title: "Archived Templates | Ving Creative",
  description: "The archived Ving Creative templates experience.",
};

export default function ArchivedTemplatesPage() {
  return <ArchivedTemplateStudio />;
}
