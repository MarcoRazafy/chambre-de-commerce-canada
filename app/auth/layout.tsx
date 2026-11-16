import { StyleCouleursChambre } from "@/components/StyleCouleursChambre";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marque min-h-screen flex flex-col">
      <StyleCouleursChambre />
      {children}
    </div>
  );
}
