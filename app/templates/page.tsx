import type { Metadata } from "next";
import TemplateStudio from "@/components/templates/TemplateStudio";

export const metadata: Metadata = {
  title: "Templates | Ving Creative",
  description: "Khám phá và sử dụng các công thức tạo ảnh AI của Ving.",
};

export default function TemplatesPage() {
  return <TemplateStudio />;
}
