import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillPays - Decentralized Learning Platform",
  description: "A blockchain-based platform for skill development, mentorship, and credential verification",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <ToastProvider>
            <Layout>{children}</Layout>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
