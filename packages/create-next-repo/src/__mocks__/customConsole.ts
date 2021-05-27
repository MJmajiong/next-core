export enum LogLevel {
  DEFAULT = 0,
  VERBOSE = 1,
}

export const customConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
