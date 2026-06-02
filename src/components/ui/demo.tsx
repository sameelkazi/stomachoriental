"use client";

import { DatePicker } from "@/components/ui/heroui-date-picker";

export default function DefaultDemo() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-8">
      <DatePicker label="Date" />
    </div>
  );
}

export { DefaultDemo };
