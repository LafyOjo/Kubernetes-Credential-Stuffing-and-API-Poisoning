import * as React from "react";
import { cn } from "../../lib/utils";

export function Button({ className, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm font-medium",
        className
      )}
      {...props}
    />
  );
}
