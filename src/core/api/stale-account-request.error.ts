export class StaleAccountRequestError extends Error {
  constructor() {
    super('The active account changed while the request was in progress')
    this.name = 'StaleAccountRequestError'
  }
}
