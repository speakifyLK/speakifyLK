import type { HTMLAttributes } from "react";

export const Loader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={["speakify-loader", className].filter(Boolean).join(" ")}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
};
