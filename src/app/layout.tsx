import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowTalk",
  description:
    "Transforme descricoes em linguagem natural em fluxogramas elegantes com apoio de IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
