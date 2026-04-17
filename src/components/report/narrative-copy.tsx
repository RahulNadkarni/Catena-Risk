"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function NarrativeCopy({ text }: { text: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {done ? "Copied" : "Copy narrative"}
    </Button>
  );
}
