import { useRef } from "react";

export function BadCompiler() {
  const ref = useRef<HTMLDivElement | null>(null);
  return <div>{ref.current}</div>;
}
