import AuthButton from "@/components/auth/AuthButton";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AuthButton />
      {children}
    </>
  );
}
