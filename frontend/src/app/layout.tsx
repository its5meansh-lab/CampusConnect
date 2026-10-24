import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Care | Smart Campus Facility & Emergency Operations",
  description: "Campus Care — Smart complaint resolution, fair technician load balancing, and emergency response platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
