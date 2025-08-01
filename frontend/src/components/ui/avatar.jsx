// src/components/ui/avatar.jsx
import * as React from "react";
import { cn } from "@/lib/utils"; // Adjust this import if you don't have cn()

const Avatar = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  );
});
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <img
      ref={ref}
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
