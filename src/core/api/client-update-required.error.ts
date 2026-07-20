export class ClientUpdateRequiredError extends Error {
  constructor() {
    super('The client must be updated before accessing the server')
    this.name = 'ClientUpdateRequiredError'
  }
}
