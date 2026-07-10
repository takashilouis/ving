export const metadata = {
    title: "Studio | Ving",
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen w-screen overflow-hidden bg-[#0A0A0A]">
            {children}
        </div>
    );
}
