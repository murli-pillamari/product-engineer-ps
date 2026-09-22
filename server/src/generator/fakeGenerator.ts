export type FakeGeneratorOptions = {
  count?: number;
  delayMs?: number;
  failAfter?: number;
};

export async function* fakeGenerator(
  options: FakeGeneratorOptions = {}
): AsyncGenerator<string> {
  const {
    count = 10,
    delayMs = 300,
    failAfter,
  } = options;

  for (let i = 1; i <= count; i++) {
    if (failAfter !== undefined && i > failAfter) {
      throw new Error("Fake generator failed");
    }

    await new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });

    yield `chunk-${String(i).padStart(3, "0")}`;
  }
}