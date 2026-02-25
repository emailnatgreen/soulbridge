import React from 'react';
import { Toaster } from "@/components/ui/sonner";
import AxiFloatingButton from "@/components/AxiFloatingButton";

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Toaster />
      <AxiFloatingButton />
    </>
  );
}