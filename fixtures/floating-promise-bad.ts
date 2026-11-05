export function fire() {
  Promise.resolve(1).then((value) => value + 1);
}
