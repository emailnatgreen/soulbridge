import React from 'react';
import { Toaster } from "@/components/ui/sonner";

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}