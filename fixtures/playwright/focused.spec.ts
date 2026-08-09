declare const test: { only(name: string, callback: () => void): void };

test.only("playwright test", () => {});
