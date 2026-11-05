declare class Service {
  save(): void;
}

declare const service: Service;
declare const expect: (value: () => void) => { toHaveBeenCalled: () => void };

expect(service.save).toHaveBeenCalled();
