import { css, on, unsafeHTML, type Handle } from "remix/component";

export function Counter(handle: Handle) {
  let count = 0;

  return () => (
    <div class="counter" mix={css({ display: "flex" })}>
      <button
        type="button"
        mix={on("click", () => {
          count += 1;
          handle.update();
        })}
      >
        {count}
      </button>
      <p innerHTML={unsafeHTML("<strong>bold</strong>")} />
    </div>
  );
}
