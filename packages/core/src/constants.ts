import packageData from '../package.json' with { type: 'json' };

export const OS = process.platform;
export const VERSION = packageData.version;
