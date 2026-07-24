import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HypoCycle",
  description: "Evidence-driven experimentation for AI agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}
