import AuthButton from "@/components/auth/AuthButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthButton />
      {children}
    </>
  );
}
