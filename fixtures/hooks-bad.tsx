import { useState } from "react";

export function BadHooks(props: { cond: boolean }) {
  if (props.cond) {
    useState(0);
  }
  return <div />;
}
