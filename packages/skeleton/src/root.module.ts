import { Module } from '@sway-kit/core';
import { RootController } from './root.controller.ts';

export class RootModule implements Module {
  public readonly controllers = [
    RootController,
  ];
}
