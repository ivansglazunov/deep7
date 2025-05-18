// Contains utility functions related to Promises, such as delay mechanisms, for asynchronous operations within or testing the Deep framework.

export function _delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
