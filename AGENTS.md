## Building and running

Before submitting any changes, it is crucial to validate them by running the
full preflight check. This command will build the repository, run all tests,
check for type errors, and lint the code.

To run the full suite of checks, execute the following command:

```bash
npm run preflight
```

## Writing Tests

This project uses **Vitest** as its primary testing framework. When writing
tests, aim to follow existing patterns. Key conventions include:

### Test Structure and Framework

- **Framework**: All tests are written using Vitest (`describe`, `it`, `expect`,
  `vi`).
- **File Location**: Test files (`*.test.ts` for logic, `*.test.tsx` for React
  components) are co-located with the source files they test.
- **Configuration**: Test environments are defined in `vitest.config.ts` files.
- **Setup/Teardown**: Use `beforeEach` and `afterEach`. Commonly,
  `vi.resetAllMocks()` is called in `beforeEach` and `vi.restoreAllMocks()` in
  `afterEach`.

### Mocking (`vi` from Vitest)

- **ES Modules**: Mock with
  `vi.mock('module-name', async (importOriginal) => { ... })`. Use
  `importOriginal` for selective mocking.
  - _Example_:
    `vi.mock('os', async (importOriginal) => { const actual = await importOriginal(); return { ...actual, homedir: vi.fn() }; });`
- **Mocking Order**: For critical dependencies (e.g., `os`, `fs`) that affect
  module-level constants, place `vi.mock` at the _very top_ of the test file,
  before other imports.
- **Hoisting**: Use `const myMock = vi.hoisted(() => vi.fn());` if a mock
  function needs to be defined before its use in a `vi.mock` factory.
- **Mock Functions**: Create with `vi.fn()`. Define behavior with
  `mockImplementation()`, `mockResolvedValue()`, or `mockRejectedValue()`.
- **Spying**: Use `vi.spyOn(object, 'methodName')`. Restore spies with
  `mockRestore()` in `afterEach`.

### Commonly Mocked Modules

- **Node.js built-ins**: `fs`, `fs/promises`, `os` (especially `os.homedir()`),
  `path`, `child_process` (`execSync`, `spawn`).
- **External SDKs**: `@google/genai`, `@modelcontextprotocol/sdk`.
- **Internal Project Modules**: Dependencies from other project packages are
  often mocked.

### Asynchronous Testing

- Use `async/await`.
- For timers, use `vi.useFakeTimers()`, `vi.advanceTimersByTimeAsync()`,
  `vi.runAllTimersAsync()`.
- Test promise rejections with `await expect(promise).rejects.toThrow(...)`.

### General Guidance

- When adding tests, first examine existing tests to understand and conform to
  established conventions.
- Pay close attention to the mocks at the top of existing test files; they
  reveal critical dependencies and how they are managed in a test environment.

## Git Repo

The main branch for this project is called "main"

## JavaScript/TypeScript

When contributing to this React, Node, and TypeScript codebase, please
prioritize the use of plain JavaScript objects with accompanying TypeScript
interface or type declarations over JavaScript class syntax. This approach
offers significant advantages, especially concerning interoperability with React
and overall code maintainability.

### Preferring Plain Objects over Classes

JavaScript classes, by their nature, are designed to encapsulate internal state
and behavior. While this can be useful in some object-oriented paradigms, it
often introduces unnecessary complexity and friction when working with React's
component-based architecture. Here's why plain objects are preferred:

- Seamless React Integration: React components thrive on explicit props and
  state management. Classes' tendency to store internal state directly within
  instances can make prop and state propagation harder to reason about and
  maintain. Plain objects, on the other hand, are inherently immutable (when
  used thoughtfully) and can be easily passed as props, simplifying data flow
  and reducing unexpected side effects.

- Reduced Boilerplate and Increased Conciseness: Classes often promote the use
  of constructors, this binding, getters, setters, and other boilerplate that
  can unnecessarily bloat code. TypeScript interface and type declarations
  provide powerful static type checking without the runtime overhead or
  verbosity of class definitions. This allows for more succinct and readable
  code, aligning with JavaScript's strengths in functional programming.

- Enhanced Readability and Predictability: Plain objects, especially when their
  structure is clearly defined by TypeScript

- Avoid adding unnecessary comments. Prefer good structure and naming over comments. Only comment when the intent cannot be made clear by the code itself.

- Increase test coverage meaningfully — avoid redundant or trivial tests. Focus on real logic and edge cases.
