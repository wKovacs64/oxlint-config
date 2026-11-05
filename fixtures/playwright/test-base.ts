/** Local stand-in for a Playwright custom-fixture re-export. */
type TestBody = () => void;

function run(name: string, body: TestBody) {
  console.log(name);
  body();
}

export const test = Object.assign(run, { only: run });

export const expect = (value: boolean) => ({
  toBeVisible: () => value,
  toBe: (expected: boolean) => value === expected,
});
