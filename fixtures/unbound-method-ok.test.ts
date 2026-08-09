declare const expect: (value: unknown) => { toHaveBeenCalled(): void };
declare const subject: { method(): void };

expect(subject.method).toHaveBeenCalled();
