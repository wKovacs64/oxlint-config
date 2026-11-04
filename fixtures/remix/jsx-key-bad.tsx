import type { Handle } from "remix/component";

export function List(handle: Handle<{ items: string[] }>) {
  return () => (
    <ul>
      {handle.props.items.map((item) => (
        <li>{item}</li>
      ))}
    </ul>
  );
}
