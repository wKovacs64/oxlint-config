import { useEffect, useState } from "react";

export function GoodHooks(props: { id: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log(props.id, count);
  }, [props.id, count]);

  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      {count}
    </button>
  );
}
