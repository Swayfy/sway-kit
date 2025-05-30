import { Controller, HttpStatus, Route } from '@sway-kit/core';

export class RootController extends Controller {
  @Route.Get('/')
  public async index() {
    return await this.render('home', {
      message: 'Welcome to SwayKit Core',
    });
  }

  @Route.Error()
  public async error(status: HttpStatus, message: string) {
    return await this.render('error', {
      status,
      message,
    });
  }
}
